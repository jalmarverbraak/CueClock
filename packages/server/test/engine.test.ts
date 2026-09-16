import { describe, expect, it } from 'vitest';
import { Engine, EngineError } from '../src/engine';

const T0 = 1_700_000_000_000;

describe('quick timer', () => {
  it('counts down at real time when speed is 100%', () => {
    const engine = new Engine(() => T0);
    engine.startQuick(600, T0);
    const state = engine.getState(T0 + 10_000);
    expect(state.remainingSeconds).toBeCloseTo(590, 5);
    expect(state.mode).toBe('quick');
    expect(state.running).toBe(true);
  });

  it('goes negative (overtime) past zero and keeps counting', () => {
    const engine = new Engine(() => T0);
    engine.startQuick(5, T0);
    const state = engine.getState(T0 + 8_000);
    expect(state.remainingSeconds).toBeCloseTo(-3, 5);
    expect(state.colorState).toBe('overtime');
  });

  it('pause freezes remaining time, resume continues from there', () => {
    const engine = new Engine(() => T0);
    engine.startQuick(100, T0);
    engine.pause(T0 + 10_000);
    expect(engine.getState(T0 + 50_000).remainingSeconds).toBeCloseTo(90, 5);

    engine.resume(T0 + 50_000);
    const state = engine.getState(T0 + 55_000);
    expect(state.remainingSeconds).toBeCloseTo(85, 5);
    expect(state.running).toBe(true);
  });

  it('rejects a non-positive duration', () => {
    const engine = new Engine(() => T0);
    expect(() => engine.startQuick(0, T0)).toThrow(EngineError);
    expect(() => engine.startQuick(-5, T0)).toThrow(EngineError);
  });
});

describe('arming a quick timer', () => {
  it('sets the duration without starting it', () => {
    const engine = new Engine(() => T0);
    engine.armQuick(300, T0);
    const state = engine.getState(T0 + 10_000);
    expect(state.mode).toBe('quick');
    expect(state.running).toBe(false);
    expect(state.remainingSeconds).toBe(300);
    expect(state.durationSeconds).toBe(300);
  });

  it('can be started afterwards with resume', () => {
    const engine = new Engine(() => T0);
    engine.armQuick(300, T0);
    engine.resume(T0 + 5_000);
    const state = engine.getState(T0 + 15_000);
    expect(state.running).toBe(true);
    expect(state.remainingSeconds).toBeCloseTo(290, 5);
  });

  it('rejects a non-positive duration', () => {
    const engine = new Engine(() => T0);
    expect(() => engine.armQuick(0, T0)).toThrow(EngineError);
  });
});

describe('add / remove time', () => {
  it('extends remaining and total duration', () => {
    const engine = new Engine(() => T0);
    engine.startQuick(300, T0);
    engine.addSeconds(120, T0 + 10_000);
    const state = engine.getState(T0 + 10_000);
    expect(state.remainingSeconds).toBeCloseTo(300 - 10 + 120, 5);
    expect(state.durationSeconds).toBe(420);
  });

  it('can subtract time, including into overtime', () => {
    const engine = new Engine(() => T0);
    engine.startQuick(60, T0);
    engine.addSeconds(-90, T0);
    expect(engine.getState(T0).remainingSeconds).toBeCloseTo(-30, 5);
  });

  it('throws when no timer is active', () => {
    const engine = new Engine(() => T0);
    expect(() => engine.addSeconds(60, T0)).toThrow(EngineError);
  });
});

describe('speed control', () => {
  it('105% speed counts down 5% faster than real time', () => {
    const engine = new Engine(() => T0);
    engine.startQuick(1000, T0);
    engine.setSpeed(105, T0);
    const state = engine.getState(T0 + 100_000);
    // 100 real seconds elapsed * 1.05 = 105 timer-seconds consumed
    expect(state.remainingSeconds).toBeCloseTo(1000 - 105, 5);
  });

  it('95% speed counts down slower than real time', () => {
    const engine = new Engine(() => T0);
    engine.startQuick(1000, T0);
    engine.setSpeed(95, T0);
    const state = engine.getState(T0 + 100_000);
    expect(state.remainingSeconds).toBeCloseTo(1000 - 95, 5);
  });

  it('mid-run speed changes do not cause a jump', () => {
    const engine = new Engine(() => T0);
    engine.startQuick(1000, T0);
    // first 50s at 100%
    engine.setSpeed(100, T0);
    let now = T0 + 50_000;
    expect(engine.getState(now).remainingSeconds).toBeCloseTo(950, 5);
    // switch to 200% for next 10s
    engine.setSpeed(200, now);
    now += 10_000;
    expect(engine.getState(now).remainingSeconds).toBeCloseTo(950 - 20, 5);
  });

  it('rejects out-of-range speeds', () => {
    const engine = new Engine(() => T0);
    engine.startQuick(100, T0);
    expect(() => engine.setSpeed(10, T0)).toThrow(EngineError);
    expect(() => engine.setSpeed(1000, T0)).toThrow(EngineError);
  });
});

describe('color thresholds', () => {
  it('reports normal, warning, critical, overtime at the right boundaries', () => {
    const engine = new Engine(() => T0);
    engine.startQuick(1000, T0);
    engine.setThresholds({ warningAtSeconds: 120, criticalAtSeconds: 30 });

    expect(engine.getState(T0).colorState).toBe('normal');
    expect(engine.getState(T0 + (1000 - 120) * 1000).colorState).toBe('warning');
    expect(engine.getState(T0 + (1000 - 30) * 1000).colorState).toBe('critical');
    expect(engine.getState(T0 + 1000 * 1000 + 1).colorState).toBe('overtime');
  });

  it('rejects thresholds where warning <= critical', () => {
    const engine = new Engine(() => T0);
    expect(() => engine.setThresholds({ warningAtSeconds: 10, criticalAtSeconds: 30 })).toThrow(
      EngineError,
    );
  });
});

describe('schedules', () => {
  function scheduleEngine() {
    const engine = new Engine(() => T0);
    const schedule = engine.saveSchedule({
      id: '',
      name: 'Conference Day 1',
      blocks: [
        { id: '', name: 'Opening', durationSeconds: 300 },
        { id: '', name: 'Keynote', durationSeconds: 600 },
        { id: '', name: 'Closing', durationSeconds: 120 },
      ],
    });
    return { engine, schedule };
  }

  it('starts the first block on startSchedule', () => {
    const { engine, schedule } = scheduleEngine();
    engine.startSchedule(schedule.id, T0);
    const state = engine.getState(T0);
    expect(state.mode).toBe('block');
    expect(state.activeBlockId).toBe(schedule.blocks[0].id);
    expect(state.durationSeconds).toBe(300);
    expect(state.scheduleOffsetSeconds).toBe(0);
  });

  it('advancing on time keeps schedule offset at zero', () => {
    const { engine, schedule } = scheduleEngine();
    engine.startSchedule(schedule.id, T0);
    engine.nextBlock(T0 + 300_000); // finished opening exactly on time
    const state = engine.getState(T0 + 300_000);
    expect(state.activeBlockId).toBe(schedule.blocks[1].id);
    expect(state.scheduleOffsetSeconds).toBeCloseTo(0, 5);
  });

  it('running over on a block accumulates positive (behind) schedule offset', () => {
    const { engine, schedule } = scheduleEngine();
    engine.startSchedule(schedule.id, T0);
    // opening block goes 60s over its planned 300s
    engine.nextBlock(T0 + 360_000);
    const state = engine.getState(T0 + 360_000);
    expect(state.scheduleOffsetSeconds).toBeCloseTo(60, 5);

    // Keynote block finishes 20s early -> offset should drop back to 40
    engine.nextBlock(T0 + 360_000 + 580_000);
    expect(engine.getState(T0 + 360_000 + 580_000).scheduleOffsetSeconds).toBeCloseTo(40, 5);
  });

  it('projects future block start/end times based on the active block finishing on schedule', () => {
    const { engine, schedule } = scheduleEngine();
    engine.startSchedule(schedule.id, T0);
    const now = T0 + 100_000; // 100s into the 300s opening block
    const projections = engine.getState(now).blockProjections;

    expect(projections[0].status).toBe('active');
    expect(projections[0].projectedEndMs).toBeCloseTo(T0 + 300_000, -1);

    expect(projections[1].status).toBe('upcoming');
    expect(projections[1].projectedStartMs).toBeCloseTo(T0 + 300_000, -1);
    expect(projections[1].projectedEndMs).toBeCloseTo(T0 + 300_000 + 600_000, -1);
  });

  it('keeps projecting start/end times live while the active block is in overtime', () => {
    const { engine, schedule } = scheduleEngine();
    engine.startSchedule(schedule.id, T0);
    const now = T0 + 400_000; // 100s into overtime on a 300s block
    const projections = engine.getState(now).blockProjections;
    // "if it ended right now" - keeps sliding forward every tick instead of going unknown
    expect(projections[0].status).toBe('active');
    expect(projections[0].projectedEndMs).toBe(now);
    expect(projections[1].projectedStartMs).toBe(now);
    expect(projections[1].projectedEndMs).toBe(now + 600_000);
  });

  it('finishing the last block returns engine to idle', () => {
    const { engine, schedule } = scheduleEngine();
    engine.startSchedule(schedule.id, T0);
    engine.nextBlock(T0 + 300_000);
    engine.nextBlock(T0 + 900_000);
    engine.nextBlock(T0 + 1_020_000);
    const state = engine.getState(T0 + 1_020_000);
    expect(state.mode).toBe('idle');
    expect(state.activeBlockId).toBeNull();
  });

  it('jumping forward skips blocks neutrally (no offset penalty for skipped blocks)', () => {
    const { engine, schedule } = scheduleEngine();
    engine.startSchedule(schedule.id, T0);
    // jump straight to Closing (index 2), skipping Keynote, after running 10s over on Opening
    engine.jumpToBlock(schedule.id, schedule.blocks[2].id, T0 + 310_000);
    const state = engine.getState(T0 + 310_000);
    expect(state.activeBlockId).toBe(schedule.blocks[2].id);
    // only the +10s overrun on Opening counts; Keynote was skipped at its planned duration
    expect(state.scheduleOffsetSeconds).toBeCloseTo(10, 5);
  });

  it('rejects starting a schedule with no blocks', () => {
    const engine = new Engine(() => T0);
    const schedule = engine.saveSchedule({ id: '', name: 'Empty', blocks: [] });
    expect(() => engine.startSchedule(schedule.id, T0)).toThrow(EngineError);
  });

  it('nextBlock throws when nothing is running', () => {
    const engine = new Engine(() => T0);
    expect(() => engine.nextBlock(T0)).toThrow(EngineError);
  });
});

describe('reset', () => {
  it('returns to idle and clears active schedule/timer state, and resets speed to 100', () => {
    const engine = new Engine(() => T0);
    engine.startQuick(100, T0);
    engine.setSpeed(120, T0);
    engine.reset(T0 + 5_000);
    const state = engine.getState(T0 + 5_000);
    expect(state.mode).toBe('idle');
    expect(state.remainingSeconds).toBe(0);
    expect(state.speedPercent).toBe(100);
  });
});

describe('presets, quick messages, and library CRUD', () => {
  it('saves and deletes presets', () => {
    const engine = new Engine(() => T0);
    const preset = engine.savePreset('Lightning talk', 300);
    expect(engine.getState(T0).presets).toHaveLength(1);
    engine.deletePreset(preset.id);
    expect(engine.getState(T0).presets).toHaveLength(0);
  });

  it('rejects an empty preset name or non-positive duration', () => {
    const engine = new Engine(() => T0);
    expect(() => engine.savePreset('', 60)).toThrow(EngineError);
    expect(() => engine.savePreset('Talk', 0)).toThrow(EngineError);
  });

  it('saves and deletes quick messages', () => {
    const engine = new Engine(() => T0);
    const msg = engine.saveQuickMessage('Please wrap up');
    expect(engine.getState(T0).quickMessages).toHaveLength(1);
    engine.deleteQuickMessage(msg.id);
    expect(engine.getState(T0).quickMessages).toHaveLength(0);
  });

  it('setMessage trims and clears', () => {
    const engine = new Engine(() => T0);
    engine.setMessage('  5 minutes left  ');
    expect(engine.getState(T0).message).toBe('5 minutes left');
    engine.setMessage('');
    expect(engine.getState(T0).message).toBeNull();
  });

  it('updating a schedule that is currently active updates the live view too', () => {
    const engine = new Engine(() => T0);
    const schedule = engine.saveSchedule({
      id: '',
      name: 'Day 1',
      blocks: [{ id: '', name: 'Opening', durationSeconds: 300 }],
    });
    engine.startSchedule(schedule.id, T0);
    engine.saveSchedule({ ...schedule, name: 'Day 1 (renamed)' });
    expect(engine.getState(T0).activeSchedule?.name).toBe('Day 1 (renamed)');
  });
});

describe('display settings', () => {
  it('defaults to timer mode with block name shown and time-below hidden', () => {
    const engine = new Engine(() => T0);
    const settings = engine.getState(T0).displaySettings;
    expect(settings).toEqual({ mode: 'timer', showBlockName: true, showTimeBelow: false });
  });

  it('persists updated display settings', () => {
    const engine = new Engine(() => T0);
    engine.setDisplaySettings({ mode: 'clock', showBlockName: false, showTimeBelow: true });
    expect(engine.getState(T0).displaySettings).toEqual({
      mode: 'clock',
      showBlockName: false,
      showTimeBelow: true,
    });
    expect(engine.getPersistedState().displaySettings.mode).toBe('clock');
  });
});
