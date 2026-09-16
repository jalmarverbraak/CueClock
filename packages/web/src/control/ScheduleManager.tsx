import { useState } from 'react';
import { nanoid } from 'nanoid';
import type { Command, EngineState, Schedule, ScheduleBlock } from '@cueclock/shared';
import {
  formatClock,
  formatDelay,
  formatDuration,
  formatOffset,
  minutesToTimeInput,
  parseDurationInput,
  resolveNextOccurrence,
  timeInputToMinutes,
} from '../shared/format';

interface Props {
  state: EngineState;
  sendCommand: (c: Command) => void;
}

function blankBlock(): ScheduleBlock {
  return { id: nanoid(8), name: '', durationSeconds: 300, startTimeMinutes: null, endTimeMinutes: null };
}

function totalDuration(schedule: Schedule): number {
  return schedule.blocks.reduce((sum, b) => sum + b.durationSeconds, 0);
}

export function ScheduleManager({ state, sendCommand }: Props) {
  const [editing, setEditing] = useState<Schedule | null>(null);
  const isRunning = state.mode === 'block' && state.blockProjections.length > 0;

  function startEditingNew() {
    setEditing({ id: '', name: '', blocks: [blankBlock()] });
  }

  function saveEditing() {
    if (!editing) return;
    if (!editing.name.trim() || editing.blocks.length === 0) return;
    sendCommand({ type: 'saveSchedule', schedule: editing });
    setEditing(null);
  }

  return (
    <section className="panel">
      <h2>Rundown / Schedule</h2>

      <div className="schedule-manager__scroll">
        {isRunning && <RunningRundown state={state} sendCommand={sendCommand} />}

        <div className="schedule-manager__library">
          <div className="panel__row-header">
            <h3>Saved schedules</h3>
            {!editing && (
              <button className="btn btn--secondary" onClick={startEditingNew}>
                + New schedule
              </button>
            )}
          </div>

          {state.schedules.length === 0 && !editing && (
            <p className="panel__hint">No schedules yet — create one to plan out blocks with durations.</p>
          )}

          {!editing &&
            state.schedules.map((s) => {
              const firstStart = s.blocks[0]?.startTimeMinutes ?? null;
              const secondsUntilStart =
                firstStart !== null ? Math.round((resolveNextOccurrence(firstStart, Date.now()) - Date.now()) / 1000) : null;
              return (
                <div key={s.id} className="schedule-row">
                  <div className="schedule-row__info">
                    <strong>{s.name}</strong>
                    <span>
                      {s.blocks.length} block{s.blocks.length === 1 ? '' : 's'} · {formatDuration(totalDuration(s))}
                      {firstStart !== null && <> · starts {minutesToTimeInput(firstStart)}</>}
                    </span>
                  </div>
                  <div className="schedule-row__actions">
                    {secondsUntilStart !== null && secondsUntilStart > 0 && (
                      <button
                        className="btn btn--chip"
                        title={`Start a live countdown to ${minutesToTimeInput(firstStart!)}`}
                        onClick={() => sendCommand({ type: 'startQuick', durationSeconds: secondsUntilStart })}
                      >
                        Countdown to {minutesToTimeInput(firstStart!)}
                      </button>
                    )}
                    <button className="btn btn--primary" onClick={() => sendCommand({ type: 'startSchedule', scheduleId: s.id })}>
                      Start
                    </button>
                    <button className="btn btn--chip" onClick={() => setEditing(s)}>
                      Edit
                    </button>
                    <button className="btn btn--chip" onClick={() => sendCommand({ type: 'deleteSchedule', id: s.id })}>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
        </div>

        {editing && (
          <ScheduleEditor
            schedule={editing}
            onChange={setEditing}
            onSave={saveEditing}
            onCancel={() => setEditing(null)}
          />
        )}
      </div>
    </section>
  );
}

function RunningRundown({ state, sendCommand }: Props) {
  const offset = state.scheduleOffsetSeconds;
  return (
    <div className="rundown">
      <div className={`rundown__offset ${offset !== null && offset > 0 ? 'behind' : 'ahead'}`}>
        {formatOffset(offset)}
      </div>
      <table className="rundown__table">
        <thead>
          <tr>
            <th>Block</th>
            <th>Status</th>
            <th>Start → End</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {state.blockProjections.map((b) => (
            <tr key={b.blockId} className={`rundown__row rundown__row--${b.status}`}>
              <td>
                {b.name}
                {b.delaySeconds !== null && (
                  <div className={`rundown__delay ${b.delaySeconds > 30 ? 'late' : b.delaySeconds < -30 ? 'early' : ''}`}>
                    {formatDelay(b.delaySeconds)}
                  </div>
                )}
              </td>
              <td>{b.status}</td>
              <td>
                {formatClock(b.projectedStartMs)} → {formatClock(b.projectedEndMs)}
              </td>
              <td>
                {b.status !== 'active' && state.activeSchedule && (
                  <button
                    className="btn btn--chip"
                    onClick={() =>
                      sendCommand({ type: 'startBlock', scheduleId: state.activeSchedule!.id, blockId: b.blockId })
                    }
                  >
                    Jump
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type TimeMode = 'duration' | 'start-duration' | 'start-end' | 'end-duration';

function modeOf(block: ScheduleBlock): TimeMode {
  if (block.startTimeMinutes !== null && block.endTimeMinutes !== null) return 'start-end';
  if (block.startTimeMinutes !== null) return 'start-duration';
  if (block.endTimeMinutes !== null) return 'end-duration';
  return 'duration';
}

function ScheduleEditor({
  schedule,
  onChange,
  onSave,
  onCancel,
}: {
  schedule: Schedule;
  onChange: (s: Schedule) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  function updateBlock(index: number, patch: Partial<ScheduleBlock>) {
    const blocks = schedule.blocks.map((b, i) => (i === index ? { ...b, ...patch } : b));
    onChange({ ...schedule, blocks });
  }

  function setMode(index: number, mode: TimeMode) {
    const block = schedule.blocks[index];
    switch (mode) {
      case 'duration':
        updateBlock(index, { startTimeMinutes: null, endTimeMinutes: null });
        break;
      case 'start-duration':
        updateBlock(index, { startTimeMinutes: block.startTimeMinutes ?? 0, endTimeMinutes: null });
        break;
      case 'end-duration':
        updateBlock(index, { startTimeMinutes: null, endTimeMinutes: block.endTimeMinutes ?? 0 });
        break;
      case 'start-end': {
        const start = block.startTimeMinutes ?? 0;
        const end = block.endTimeMinutes ?? (start + Math.round(block.durationSeconds / 60)) % 1440;
        updateBlock(index, {
          startTimeMinutes: start,
          endTimeMinutes: end,
          durationSeconds: (((end - start + 1440) % 1440) || 1440) * 60,
        });
        break;
      }
    }
  }

  function removeBlock(index: number) {
    onChange({ ...schedule, blocks: schedule.blocks.filter((_, i) => i !== index) });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= schedule.blocks.length) return;
    const blocks = [...schedule.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    onChange({ ...schedule, blocks });
  }

  const canSave = schedule.name.trim() && schedule.blocks.every((b) => b.name.trim() && b.durationSeconds > 0);

  return (
    <div className="schedule-editor">
      <input
        className="text-input"
        placeholder="Schedule name (e.g. Conference Day 1)"
        value={schedule.name}
        onChange={(e) => onChange({ ...schedule, name: e.target.value })}
      />

      {schedule.blocks.map((block, i) => {
        const mode = modeOf(block);
        return (
          <div key={block.id} className="schedule-editor__block">
            <div className="schedule-editor__block-row">
              <input
                className="text-input"
                placeholder="Block name"
                value={block.name}
                onChange={(e) => updateBlock(i, { name: e.target.value })}
              />
              <button className="btn btn--chip" disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button className="btn btn--chip" disabled={i === schedule.blocks.length - 1} onClick={() => move(i, 1)}>
                ↓
              </button>
              <button className="chip-with-delete__remove" onClick={() => removeBlock(i)}>
                ×
              </button>
            </div>

            <div className="schedule-editor__time-mode">
              <select className="text-input text-input--mode" value={mode} onChange={(e) => setMode(i, e.target.value as TimeMode)}>
                <option value="duration">Duration only</option>
                <option value="start-duration">Start time + duration</option>
                <option value="start-end">Start time + end time</option>
                <option value="end-duration">End time + duration</option>
              </select>

              {(mode === 'start-duration' || mode === 'start-end') && (
                <input
                  className="text-input text-input--time"
                  type="time"
                  value={minutesToTimeInput(block.startTimeMinutes)}
                  onChange={(e) => {
                    const mins = timeInputToMinutes(e.target.value);
                    if (mins === null) return;
                    if (mode === 'start-end') {
                      const end = block.endTimeMinutes ?? mins;
                      updateBlock(i, { startTimeMinutes: mins, durationSeconds: (((end - mins + 1440) % 1440) || 1440) * 60 });
                    } else {
                      updateBlock(i, { startTimeMinutes: mins });
                    }
                  }}
                />
              )}

              {(mode === 'end-duration' || mode === 'start-end') && (
                <input
                  className="text-input text-input--time"
                  type="time"
                  value={minutesToTimeInput(block.endTimeMinutes)}
                  onChange={(e) => {
                    const mins = timeInputToMinutes(e.target.value);
                    if (mins === null) return;
                    if (mode === 'start-end') {
                      const start = block.startTimeMinutes ?? mins;
                      updateBlock(i, { endTimeMinutes: mins, durationSeconds: (((mins - start + 1440) % 1440) || 1440) * 60 });
                    } else {
                      updateBlock(i, { endTimeMinutes: mins });
                    }
                  }}
                />
              )}

              {mode !== 'start-end' && (
                <input
                  className="text-input text-input--duration"
                  placeholder="mm:ss"
                  defaultValue={formatDuration(block.durationSeconds)}
                  onBlur={(e) => {
                    const parsed = parseDurationInput(e.target.value);
                    if (parsed !== null && parsed > 0) updateBlock(i, { durationSeconds: parsed });
                  }}
                />
              )}

              {mode === 'start-end' && (
                <span className="schedule-editor__computed-duration">= {formatDuration(block.durationSeconds)}</span>
              )}
            </div>
          </div>
        );
      })}

      <div className="schedule-editor__actions">
        <button className="btn btn--secondary" onClick={() => onChange({ ...schedule, blocks: [...schedule.blocks, blankBlock()] })}>
          + Add block
        </button>
        <div className="schedule-editor__save-cancel">
          <button className="btn btn--chip" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn--primary" disabled={!canSave} onClick={onSave}>
            Save schedule
          </button>
        </div>
      </div>
      {!canSave && <div className="field-error">Every block needs a name and a duration greater than zero.</div>}
    </div>
  );
}
