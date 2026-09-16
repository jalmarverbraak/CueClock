import { nanoid } from 'nanoid';
import type {
  ColorState,
  ColorThresholds,
  DisplaySettings,
  EngineState,
  Preset,
  QuickMessage,
  Schedule,
  ScheduleBlock,
  BlockProjection,
  TimerMode,
} from '@cueclock/shared';
import { DEFAULT_THRESHOLDS, DEFAULT_DISPLAY_SETTINGS } from '@cueclock/shared';

export class EngineError extends Error {}

interface CompletedBlock {
  blockId: string;
  name: string;
  durationSeconds: number;
  actualElapsedSeconds: number;
  startedAtMs: number;
  endedAtMs: number;
}

export interface EnginePersistedState {
  presets: Preset[];
  quickMessages: QuickMessage[];
  schedules: Schedule[];
  thresholds: ColorThresholds;
  displaySettings: DisplaySettings;
}

export type Clock = () => number;

/**
 * Single source of truth for all timer state. Time is always derived from a
 * baseline (baseRemainingSeconds/lastChangeMs) recomputed at read time, never
 * from an accumulating interval counter - this keeps every connected client in
 * sync regardless of when it last polled, and avoids drift entirely.
 */
export class Engine {
  private mode: TimerMode = 'idle';
  private running = false;
  private speedPercent = 100;
  private baseRemainingSeconds = 0;
  private lastChangeMs: number;
  private durationSeconds = 0;
  private message: string | null = null;
  private thresholds: ColorThresholds;
  private displaySettings: DisplaySettings;

  private presets: Preset[];
  private quickMessages: QuickMessage[];
  private schedules: Schedule[];

  private activeSchedule: Schedule | null = null;
  private activeBlockIndex: number | null = null;
  private activeBlockStartedAtMs: number | null = null;
  private completedBlocks: CompletedBlock[] = [];

  constructor(
    private readonly clock: Clock = Date.now,
    persisted?: Partial<EnginePersistedState>,
  ) {
    this.lastChangeMs = clock();
    this.presets = persisted?.presets ?? [];
    this.quickMessages = persisted?.quickMessages ?? [];
    this.schedules = persisted?.schedules ?? [];
    this.thresholds = persisted?.thresholds ?? { ...DEFAULT_THRESHOLDS };
    this.displaySettings = persisted?.displaySettings ?? { ...DEFAULT_DISPLAY_SETTINGS };
  }

  getPersistedState(): EnginePersistedState {
    return {
      presets: this.presets,
      quickMessages: this.quickMessages,
      schedules: this.schedules,
      thresholds: this.thresholds,
      displaySettings: this.displaySettings,
    };
  }

  // ---- internal time helpers ----

  private computeRemaining(now: number): number {
    if (!this.running) return this.baseRemainingSeconds;
    const realElapsed = (now - this.lastChangeMs) / 1000;
    return this.baseRemainingSeconds - realElapsed * (this.speedPercent / 100);
  }

  /** Folds elapsed time into baseRemainingSeconds so it's safe to mutate speed/running/etc. */
  private settle(now: number) {
    this.baseRemainingSeconds = this.computeRemaining(now);
    this.lastChangeMs = now;
  }

  private findSchedule(scheduleId: string): Schedule {
    const schedule = this.schedules.find((s) => s.id === scheduleId);
    if (!schedule) throw new EngineError(`Schedule not found: ${scheduleId}`);
    return schedule;
  }

  private beginBlock(schedule: Schedule, index: number, now: number) {
    const block = schedule.blocks[index];
    if (!block) throw new EngineError('Block index out of range');
    this.activeSchedule = schedule;
    this.activeBlockIndex = index;
    this.activeBlockStartedAtMs = now;
    this.mode = 'block';
    this.running = true;
    this.durationSeconds = block.durationSeconds;
    this.baseRemainingSeconds = block.durationSeconds;
    this.lastChangeMs = now;
    this.message = null;
  }

  // ---- commands ----

  startQuick(durationSeconds: number, now: number = this.clock()) {
    if (durationSeconds <= 0) throw new EngineError('Duration must be positive');
    this.mode = 'quick';
    this.running = true;
    this.durationSeconds = durationSeconds;
    this.baseRemainingSeconds = durationSeconds;
    this.lastChangeMs = now;
    this.activeSchedule = null;
    this.activeBlockIndex = null;
    this.activeBlockStartedAtMs = null;
    this.completedBlocks = [];
    this.message = null;
  }

  /** Sets a quick timer's duration without starting it, so an operator can arm a preset and start it explicitly. */
  armQuick(durationSeconds: number, now: number = this.clock()) {
    if (durationSeconds <= 0) throw new EngineError('Duration must be positive');
    this.mode = 'quick';
    this.running = false;
    this.durationSeconds = durationSeconds;
    this.baseRemainingSeconds = durationSeconds;
    this.lastChangeMs = now;
    this.activeSchedule = null;
    this.activeBlockIndex = null;
    this.activeBlockStartedAtMs = null;
    this.completedBlocks = [];
    this.message = null;
  }

  startSchedule(scheduleId: string, now: number = this.clock()) {
    const schedule = this.findSchedule(scheduleId);
    if (schedule.blocks.length === 0) throw new EngineError('Schedule has no blocks');
    this.completedBlocks = [];
    this.beginBlock({ ...schedule, blocks: [...schedule.blocks] }, 0, now);
  }

  /** Jump directly to a block within the currently-running schedule (or start it fresh at that block). */
  jumpToBlock(scheduleId: string, blockId: string, now: number = this.clock()) {
    const schedule = this.findSchedule(scheduleId);
    const targetIndex = schedule.blocks.findIndex((b) => b.id === blockId);
    if (targetIndex === -1) throw new EngineError('Block not found in schedule');

    const isSameRun = this.activeSchedule?.id === scheduleId && this.mode === 'block';
    const workingSchedule = isSameRun ? this.activeSchedule! : { ...schedule, blocks: [...schedule.blocks] };

    if (isSameRun && this.activeBlockIndex !== null) {
      if (targetIndex > this.activeBlockIndex) {
        this.finishActiveBlock(now);
        for (let i = this.activeBlockIndex + 1; i < targetIndex; i++) {
          const skipped = workingSchedule.blocks[i];
          this.completedBlocks.push({
            blockId: skipped.id,
            name: skipped.name,
            durationSeconds: skipped.durationSeconds,
            actualElapsedSeconds: skipped.durationSeconds,
            startedAtMs: now,
            endedAtMs: now,
          });
        }
      } else if (targetIndex < this.activeBlockIndex) {
        this.completedBlocks = this.completedBlocks.filter(
          (_, i) => i < targetIndex,
        );
      }
    } else {
      this.completedBlocks = [];
    }
    this.beginBlock(workingSchedule, targetIndex, now);
  }

  private finishActiveBlock(now: number) {
    if (this.mode !== 'block' || this.activeBlockIndex === null || !this.activeSchedule) {
      throw new EngineError('No active block to finish');
    }
    const block = this.activeSchedule.blocks[this.activeBlockIndex];
    const startedAt = this.activeBlockStartedAtMs ?? now;
    this.completedBlocks.push({
      blockId: block.id,
      name: block.name,
      durationSeconds: block.durationSeconds,
      actualElapsedSeconds: Math.max(0, (now - startedAt) / 1000),
      startedAtMs: startedAt,
      endedAtMs: now,
    });
  }

  nextBlock(now: number = this.clock()) {
    if (this.mode !== 'block' || this.activeBlockIndex === null || !this.activeSchedule) {
      throw new EngineError('No active schedule block to advance from');
    }
    this.finishActiveBlock(now);
    const nextIndex = this.activeBlockIndex + 1;
    if (nextIndex < this.activeSchedule.blocks.length) {
      this.beginBlock(this.activeSchedule, nextIndex, now);
    } else {
      this.mode = 'idle';
      this.running = false;
      this.baseRemainingSeconds = 0;
      this.durationSeconds = 0;
      this.lastChangeMs = now;
      this.activeBlockIndex = null;
      this.activeBlockStartedAtMs = null;
    }
  }

  pause(now: number = this.clock()) {
    if (this.mode === 'idle') throw new EngineError('No timer running');
    this.settle(now);
    this.running = false;
  }

  resume(now: number = this.clock()) {
    if (this.mode === 'idle') throw new EngineError('No timer to resume');
    this.lastChangeMs = now;
    this.running = true;
  }

  reset(now: number = this.clock()) {
    this.mode = 'idle';
    this.running = false;
    this.speedPercent = 100;
    this.baseRemainingSeconds = 0;
    this.durationSeconds = 0;
    this.lastChangeMs = now;
    this.activeSchedule = null;
    this.activeBlockIndex = null;
    this.activeBlockStartedAtMs = null;
    this.completedBlocks = [];
    this.message = null;
  }

  addSeconds(seconds: number, now: number = this.clock()) {
    if (this.mode === 'idle') throw new EngineError('No timer running');
    this.settle(now);
    this.baseRemainingSeconds += seconds;
    this.durationSeconds = Math.max(0, this.durationSeconds + seconds);
  }

  setSpeed(speedPercent: number, now: number = this.clock()) {
    if (speedPercent < 25 || speedPercent > 400) {
      throw new EngineError('Speed must be between 25% and 400%');
    }
    this.settle(now);
    this.speedPercent = speedPercent;
  }

  setMessage(text: string | null) {
    this.message = text && text.trim().length > 0 ? text.trim() : null;
  }

  setThresholds(thresholds: ColorThresholds) {
    if (thresholds.warningAtSeconds <= thresholds.criticalAtSeconds) {
      throw new EngineError('Warning threshold must be greater than critical threshold');
    }
    this.thresholds = thresholds;
  }

  setDisplaySettings(settings: DisplaySettings) {
    this.displaySettings = settings;
  }

  // ---- library management (presets / quick messages / schedules) ----

  savePreset(name: string, durationSeconds: number): Preset {
    if (!name.trim()) throw new EngineError('Preset name is required');
    if (durationSeconds <= 0) throw new EngineError('Duration must be positive');
    const preset: Preset = { id: nanoid(8), name: name.trim(), durationSeconds };
    this.presets.push(preset);
    return preset;
  }

  deletePreset(id: string) {
    this.presets = this.presets.filter((p) => p.id !== id);
  }

  saveQuickMessage(text: string): QuickMessage {
    if (!text.trim()) throw new EngineError('Message text is required');
    const msg: QuickMessage = { id: nanoid(8), text: text.trim() };
    this.quickMessages.push(msg);
    return msg;
  }

  deleteQuickMessage(id: string) {
    this.quickMessages = this.quickMessages.filter((m) => m.id !== id);
  }

  saveSchedule(schedule: Schedule) {
    if (!schedule.name.trim()) throw new EngineError('Schedule name is required');
    if (schedule.blocks.some((b) => b.durationSeconds <= 0)) {
      throw new EngineError('All blocks must have a positive duration');
    }
    const isValidAnchor = (m: number | null | undefined) => m == null || (m >= 0 && m < 1440);
    if (schedule.blocks.some((b) => !isValidAnchor(b.startTimeMinutes) || !isValidAnchor(b.endTimeMinutes))) {
      throw new EngineError('Block start/end time must be between 00:00 and 23:59');
    }
    const withIds: Schedule = {
      id: schedule.id || nanoid(8),
      name: schedule.name.trim(),
      blocks: schedule.blocks.map((b) => ({
        ...b,
        id: b.id || nanoid(8),
        startTimeMinutes: b.startTimeMinutes ?? null,
        endTimeMinutes: b.endTimeMinutes ?? null,
      })),
    };
    const idx = this.schedules.findIndex((s) => s.id === withIds.id);
    if (idx === -1) this.schedules.push(withIds);
    else this.schedules[idx] = withIds;

    if (this.activeSchedule?.id === withIds.id) {
      this.activeSchedule = withIds;
    }
    return withIds;
  }

  deleteSchedule(id: string) {
    this.schedules = this.schedules.filter((s) => s.id !== id);
  }

  // ---- derived state for clients ----

  private colorStateFor(remaining: number): ColorState {
    if (this.mode === 'idle') return 'normal';
    if (remaining < 0) return 'overtime';
    if (remaining <= this.thresholds.criticalAtSeconds) return 'critical';
    if (remaining <= this.thresholds.warningAtSeconds) return 'warning';
    return 'normal';
  }

  /** Resolves a "minutes since midnight" anchor to today's actual wall-clock ms, relative to `now`. */
  private resolveAnchor(minutes: number | null, now: number): number | null {
    if (minutes === null) return null;
    const d = new Date(now);
    d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    return d.getTime();
  }

  private computeProjections(now: number): BlockProjection[] {
    if (!this.activeSchedule || this.activeBlockIndex === null) return [];
    const result: BlockProjection[] = [];
    let cursor: number | null = null;

    this.activeSchedule.blocks.forEach((block: ScheduleBlock, idx: number) => {
      const anchoredStartMs = this.resolveAnchor(block.startTimeMinutes ?? null, now);

      if (idx < this.activeBlockIndex!) {
        const done = this.completedBlocks[idx];
        const projectedStartMs = done?.startedAtMs ?? null;
        result.push({
          blockId: block.id,
          name: block.name,
          durationSeconds: block.durationSeconds,
          status: 'done',
          actualElapsedSeconds: done?.actualElapsedSeconds ?? block.durationSeconds,
          projectedStartMs,
          projectedEndMs: done?.endedAtMs ?? null,
          anchoredStartMs,
          delaySeconds:
            anchoredStartMs !== null && projectedStartMs !== null
              ? (projectedStartMs - anchoredStartMs) / 1000
              : null,
        });
        cursor = done?.endedAtMs ?? cursor;
      } else if (idx === this.activeBlockIndex) {
        const remaining = this.computeRemaining(now);
        const startedAt = this.activeBlockStartedAtMs ?? now;
        // Once a block runs into overtime we can no longer predict when it will actually
        // end, but we still project "if it ended right now" so downstream blocks keep
        // sliding forward live instead of showing stale/unknown times.
        const projectedEndMs =
          remaining > 0 ? now + (remaining / (this.speedPercent / 100)) * 1000 : now;
        result.push({
          blockId: block.id,
          name: block.name,
          durationSeconds: block.durationSeconds,
          status: 'active',
          actualElapsedSeconds: (now - startedAt) / 1000,
          projectedStartMs: startedAt,
          projectedEndMs,
          anchoredStartMs,
          delaySeconds: anchoredStartMs !== null ? (startedAt - anchoredStartMs) / 1000 : null,
        });
        cursor = projectedEndMs;
      } else {
        const projectedStartMs = cursor;
        const projectedEndMs = cursor !== null ? cursor + block.durationSeconds * 1000 : null;
        result.push({
          blockId: block.id,
          name: block.name,
          durationSeconds: block.durationSeconds,
          status: 'upcoming',
          actualElapsedSeconds: null,
          projectedStartMs,
          projectedEndMs,
          anchoredStartMs,
          delaySeconds:
            anchoredStartMs !== null && projectedStartMs !== null
              ? (projectedStartMs - anchoredStartMs) / 1000
              : null,
        });
        cursor = projectedEndMs;
      }
    });

    return result;
  }

  private computeScheduleOffset(): number | null {
    if (!this.activeSchedule) return null;
    return this.completedBlocks.reduce(
      (acc, b) => acc + (b.actualElapsedSeconds - b.durationSeconds),
      0,
    );
  }

  getState(now: number = this.clock()): EngineState {
    const remainingSeconds = this.computeRemaining(now);
    return {
      mode: this.mode,
      running: this.running,
      speedPercent: this.speedPercent,
      remainingSeconds,
      durationSeconds: this.durationSeconds,
      colorState: this.colorStateFor(remainingSeconds),
      thresholds: this.thresholds,
      displaySettings: this.displaySettings,
      activeSchedule: this.activeSchedule,
      activeBlockId:
        this.activeBlockIndex !== null && this.activeSchedule
          ? this.activeSchedule.blocks[this.activeBlockIndex]?.id ?? null
          : null,
      blockProjections: this.computeProjections(now),
      scheduleOffsetSeconds: this.computeScheduleOffset(),
      message: this.message,
      presets: this.presets,
      quickMessages: this.quickMessages,
      schedules: this.schedules,
      serverTimeMs: now,
    };
  }
}
