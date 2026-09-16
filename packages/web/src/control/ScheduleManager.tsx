import { useState } from 'react';
import { nanoid } from 'nanoid';
import type { Command, EngineState, Schedule, ScheduleBlock } from '@cueclock/shared';
import { formatClock, formatDuration, formatOffset, parseDurationInput } from '../shared/format';

interface Props {
  state: EngineState;
  sendCommand: (c: Command) => void;
}

function blankBlock(): ScheduleBlock {
  return { id: nanoid(8), name: '', durationSeconds: 300 };
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
          state.schedules.map((s) => (
            <div key={s.id} className="schedule-row">
              <div className="schedule-row__info">
                <strong>{s.name}</strong>
                <span>
                  {s.blocks.length} block{s.blocks.length === 1 ? '' : 's'} · {formatDuration(totalDuration(s))}
                </span>
              </div>
              <div className="schedule-row__actions">
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
          ))}
      </div>

      {editing && (
        <ScheduleEditor
          schedule={editing}
          onChange={setEditing}
          onSave={saveEditing}
          onCancel={() => setEditing(null)}
        />
      )}
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
            <th>Planned</th>
            <th>Status</th>
            <th>Start</th>
            <th>End</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {state.blockProjections.map((b) => (
            <tr key={b.blockId} className={`rundown__row rundown__row--${b.status}`}>
              <td>{b.name}</td>
              <td>{formatDuration(b.durationSeconds)}</td>
              <td>{b.status}</td>
              <td>{formatClock(b.projectedStartMs)}</td>
              <td>{formatClock(b.projectedEndMs)}</td>
              <td>
                {b.status !== 'active' && state.activeSchedule && (
                  <button
                    className="btn btn--chip"
                    onClick={() =>
                      sendCommand({ type: 'startBlock', scheduleId: state.activeSchedule!.id, blockId: b.blockId })
                    }
                  >
                    Jump here
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

      {schedule.blocks.map((block, i) => (
        <div key={block.id} className="schedule-editor__block">
          <input
            className="text-input"
            placeholder="Block name"
            value={block.name}
            onChange={(e) => updateBlock(i, { name: e.target.value })}
          />
          <input
            className="text-input text-input--duration"
            placeholder="mm:ss"
            defaultValue={formatDuration(block.durationSeconds)}
            onBlur={(e) => {
              const parsed = parseDurationInput(e.target.value);
              if (parsed !== null && parsed > 0) updateBlock(i, { durationSeconds: parsed });
            }}
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
      ))}

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
