import { useState } from 'react';
import type { Command, EngineState } from '@cueclock/shared';
import { computeEndsAtMs, formatClock, formatDuration, formatOffset } from '../shared/format';

interface Props {
  state: EngineState;
  sendCommand: (c: Command) => void;
}

const ADJUST_STEPS = [
  { label: '1h', seconds: 3600 },
  { label: '10m', seconds: 600 },
  { label: '5m', seconds: 300 },
  { label: '1m', seconds: 60 },
  { label: '10s', seconds: 10 },
];

const SPEED_STEPS = [-10, -5, -1, 1, 5, 10];

export function NowPlaying({ state, sendCommand }: Props) {
  const [speedInput, setSpeedInput] = useState('');
  const isIdle = state.mode === 'idle';
  const hasNextBlock = state.mode === 'block' && state.blockProjections.some((b) => b.status === 'upcoming');
  const neverStarted = !isIdle && !state.running && state.remainingSeconds === state.durationSeconds;

  const endsAtMs = computeEndsAtMs(state);
  const isOver = state.remainingSeconds <= 0;

  function applySpeed(percent: number) {
    sendCommand({ type: 'setSpeed', speedPercent: percent });
  }

  function adjust(seconds: number) {
    if (isIdle) {
      if (seconds > 0) sendCommand({ type: 'armQuick', durationSeconds: seconds });
      return;
    }
    sendCommand({ type: 'addSeconds', seconds });
  }

  function setDisplayMode(mode: 'timer' | 'clock') {
    sendCommand({ type: 'setDisplaySettings', settings: { ...state.displaySettings, mode } });
  }

  return (
    <section className="panel now-playing">
      <div className="panel__row-header">
        <h2>Timer</h2>
        <div className="segmented">
          <button
            className={`segmented__option ${state.displaySettings.mode === 'timer' ? 'active' : ''}`}
            onClick={() => setDisplayMode('timer')}
          >
            Timer
          </button>
          <button
            className={`segmented__option ${state.displaySettings.mode === 'clock' ? 'active' : ''}`}
            onClick={() => setDisplayMode('clock')}
          >
            Clock
          </button>
        </div>
      </div>

      <div className={`now-playing__time now-playing__time--${state.colorState}`}>
        {isIdle ? '—:—' : formatDuration(state.remainingSeconds)}
      </div>

      {endsAtMs !== null && (
        <div className="now-playing__ends-at">
          {isOver ? 'Ended at' : 'Ends at'} {formatClock(endsAtMs, { seconds: true })}
        </div>
      )}

      {state.mode === 'block' && (
        <div className="now-playing__block-info">
          {state.blockProjections.find((b) => b.status === 'active')?.name}
          {state.scheduleOffsetSeconds !== null && (
            <span className={state.scheduleOffsetSeconds > 0 ? 'behind' : 'ahead'}>
              {' '}
              · {formatOffset(state.scheduleOffsetSeconds)}
            </span>
          )}
        </div>
      )}

      <div className="now-playing__transport">
        {isIdle ? (
          <span className="now-playing__hint">Click a + button below, or set a quick timer / schedule block.</span>
        ) : (
          <>
            {state.running ? (
              <button className="btn btn--secondary" onClick={() => sendCommand({ type: 'pause' })}>
                Pause
              </button>
            ) : (
              <button className="btn btn--primary" onClick={() => sendCommand({ type: 'resume' })}>
                {neverStarted ? 'Start' : 'Resume'}
              </button>
            )}
            {hasNextBlock && (
              <button className="btn btn--primary" onClick={() => sendCommand({ type: 'nextBlock' })}>
                Next Block →
              </button>
            )}
            <button className="btn btn--danger" onClick={() => sendCommand({ type: 'reset' })}>
              Reset
            </button>
          </>
        )}
      </div>

      <div className="adjust-grid">
        <div className="adjust-grid__row">
          {ADJUST_STEPS.map((step) => (
            <button
              key={`minus-${step.label}`}
              className="adjust-btn adjust-btn--minus"
              disabled={isIdle}
              onClick={() => adjust(-step.seconds)}
            >
              −{step.label}
            </button>
          ))}
        </div>
        <div className="adjust-grid__row">
          {ADJUST_STEPS.slice()
            .reverse()
            .map((step) => (
              <button key={`plus-${step.label}`} className="adjust-btn adjust-btn--plus" onClick={() => adjust(step.seconds)}>
                +{step.label}
              </button>
            ))}
        </div>
      </div>

      {!isIdle && (
        <div className="now-playing__row">
          <span className="now-playing__row-label">Speed ({state.speedPercent}%)</span>
          <div className="now-playing__buttons">
            {SPEED_STEPS.map((delta) => (
              <button key={delta} className="btn btn--chip" onClick={() => applySpeed(state.speedPercent + delta)}>
                {delta > 0 ? `+${delta}%` : `${delta}%`}
              </button>
            ))}
            <button className="btn btn--chip" onClick={() => applySpeed(100)}>
              Reset to 100%
            </button>
            <input
              className="now-playing__speed-input"
              placeholder="custom %"
              value={speedInput}
              onChange={(e) => setSpeedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && speedInput.trim()) {
                  applySpeed(Number(speedInput));
                  setSpeedInput('');
                }
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
