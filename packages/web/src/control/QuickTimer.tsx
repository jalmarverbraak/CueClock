import { useState } from 'react';
import type { Command, EngineState } from '@cueclock/shared';
import {
  formatDuration,
  parseDurationInput,
  resolveNextOccurrence,
  timeInputToMinutes,
} from '../shared/format';

interface Props {
  state: EngineState;
  sendCommand: (c: Command) => void;
}

type SetMode = 'duration' | 'ends-at';

export function QuickTimer({ state, sendCommand }: Props) {
  const [mode, setMode] = useState<SetMode>('duration');
  const [durationText, setDurationText] = useState('5:00');
  const [endsAtText, setEndsAtText] = useState('');

  const parsedDuration = parseDurationInput(durationText);
  const endMinutes = timeInputToMinutes(endsAtText);
  const parsedFromEndsAt =
    endMinutes !== null ? Math.round((resolveNextOccurrence(endMinutes, Date.now()) - Date.now()) / 1000) : null;

  const parsed = mode === 'duration' ? parsedDuration : parsedFromEndsAt;
  const isValid = parsed !== null && parsed > 0;
  const alreadySaved = mode === 'duration' && isValid && state.presets.some((p) => p.durationSeconds === parsed);

  function start() {
    if (!isValid || parsed === null) return;
    sendCommand({ type: 'startQuick', durationSeconds: parsed });
  }

  function saveAsPreset() {
    if (mode !== 'duration' || !isValid || parsed === null || alreadySaved) return;
    sendCommand({ type: 'savePreset', name: formatDuration(parsed), durationSeconds: parsed });
  }

  return (
    <section className="panel">
      <div className="panel__row-header">
        <h2>Quick Timer</h2>
        <div className="segmented">
          <button className={`segmented__option ${mode === 'duration' ? 'active' : ''}`} onClick={() => setMode('duration')}>
            Duration
          </button>
          <button className={`segmented__option ${mode === 'ends-at' ? 'active' : ''}`} onClick={() => setMode('ends-at')}>
            Ends at
          </button>
        </div>
      </div>
      <p className="panel__hint">
        {mode === 'duration'
          ? 'Always available, independent of any schedule. Enter minutes, or mm:ss / hh:mm:ss.'
          : 'Set a clock time (e.g. 19:00) and the timer will run for exactly that long.'}
      </p>

      <div className="quick-timer__compose">
        {mode === 'duration' ? (
          <input
            className="text-input"
            value={durationText}
            onChange={(e) => setDurationText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && start()}
            aria-label="Duration"
          />
        ) : (
          <input
            className="text-input"
            type="time"
            value={endsAtText}
            onChange={(e) => setEndsAtText(e.target.value)}
            aria-label="Ends at"
          />
        )}
        <button className="btn btn--primary" disabled={!isValid} onClick={start}>
          Start {isValid ? formatDuration(parsed!) : ''}
        </button>
        {mode === 'duration' && (
          <button className="btn btn--secondary" disabled={!isValid || alreadySaved} onClick={saveAsPreset}>
            {alreadySaved ? 'Saved' : '+ Save as preset'}
          </button>
        )}
      </div>
      {mode === 'duration' && !isValid && durationText.trim() !== '' && (
        <div className="field-error">Enter a duration like “5:00” or “5” (minutes).</div>
      )}
      {mode === 'ends-at' && endsAtText && !isValid && <div className="field-error">Pick a valid time.</div>}
    </section>
  );
}
