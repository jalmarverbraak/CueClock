import { useState } from 'react';
import type { Command, EngineState } from '@cueclock/shared';
import { formatDuration, parseDurationInput } from '../shared/format';

interface Props {
  state: EngineState;
  sendCommand: (c: Command) => void;
}

export function QuickTimer({ state, sendCommand }: Props) {
  const [durationText, setDurationText] = useState('5:00');

  const parsed = parseDurationInput(durationText);
  const isValid = parsed !== null && parsed > 0;
  const alreadySaved = isValid && state.presets.some((p) => p.durationSeconds === parsed);

  function start() {
    if (!isValid || parsed === null) return;
    sendCommand({ type: 'startQuick', durationSeconds: parsed });
  }

  function saveAsPreset() {
    if (!isValid || parsed === null || alreadySaved) return;
    sendCommand({ type: 'savePreset', name: formatDuration(parsed), durationSeconds: parsed });
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
        <button className="btn btn--secondary" disabled={!isValid || alreadySaved} onClick={saveAsPreset}>
          {alreadySaved ? 'Saved' : '+ Save as preset'}
        </button>
      </div>
      {!isValid && durationText.trim() !== '' && (
        <div className="field-error">Enter a duration like “5:00” or “5” (minutes).</div>
      )}

      {state.presets.length > 0 && (
        <>
          <h3>Presets — click to set, then press Start</h3>
          <div className="preset-grid">
            {state.presets
              .slice()
              .sort((a, b) => a.durationSeconds - b.durationSeconds)
              .map((p) => (
                <button
                  key={p.id}
                  className="preset-chip"
                  onClick={() => sendCommand({ type: 'armQuick', durationSeconds: p.durationSeconds })}
                >
                  {formatDuration(p.durationSeconds)}
                  <span
                    className="preset-chip__remove"
                    role="button"
                    tabIndex={-1}
                    title="Delete this preset"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendCommand({ type: 'deletePreset', id: p.id });
                    }}
                  >
                    ×
                  </span>
                </button>
              ))}
          </div>
        </>
      )}
    </section>
  );
}
