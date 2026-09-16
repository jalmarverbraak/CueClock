import { useState } from 'react';
import type { Command, EngineState } from '@cueclock/shared';
import { formatDuration, parseDurationInput } from '../shared/format';

interface Props {
  state: EngineState;
  sendCommand: (c: Command) => void;
}

export function QuickTimer({ state, sendCommand }: Props) {
  const [durationText, setDurationText] = useState('5:00');
  const [presetName, setPresetName] = useState('');

  const parsed = parseDurationInput(durationText);
  const isValid = parsed !== null && parsed > 0;

  function start() {
    if (!isValid || parsed === null) return;
    sendCommand({ type: 'startQuick', durationSeconds: parsed });
  }

  function savePreset() {
    if (!isValid || parsed === null || !presetName.trim()) return;
    sendCommand({ type: 'savePreset', name: presetName.trim(), durationSeconds: parsed });
    setPresetName('');
  }

  return (
    <section className="panel">
      <h2>Quick Timer</h2>
      <p className="panel__hint">Always available, independent of any schedule. Enter minutes, or mm:ss / hh:mm:ss.</p>

      <div className="quick-timer__compose">
        <input
          className="text-input"
          value={durationText}
          onChange={(e) => setDurationText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && start()}
          aria-label="Duration"
        />
        <button className="btn btn--primary" disabled={!isValid} onClick={start}>
          Start {isValid ? formatDuration(parsed!) : ''}
        </button>
      </div>
      {!isValid && durationText.trim() !== '' && (
        <div className="field-error">Enter a duration like “5:00” or “5” (minutes).</div>
      )}

      <div className="quick-timer__save">
        <input
          className="text-input"
          placeholder="Save this duration as a preset…"
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && savePreset()}
        />
        <button className="btn btn--secondary" disabled={!isValid || !presetName.trim()} onClick={savePreset}>
          Save preset
        </button>
      </div>

      {state.presets.length > 0 && (
        <div className="quick-timer__presets">
          {state.presets.map((p) => (
            <div key={p.id} className="chip-with-delete">
              <button
                className="btn btn--chip"
                onClick={() => sendCommand({ type: 'startQuick', durationSeconds: p.durationSeconds })}
              >
                {p.name} · {formatDuration(p.durationSeconds)}
              </button>
              <button
                className="chip-with-delete__remove"
                title="Delete this preset"
                onClick={() => sendCommand({ type: 'deletePreset', id: p.id })}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
