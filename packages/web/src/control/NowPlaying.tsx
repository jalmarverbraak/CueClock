import { useState } from 'react';
import type { Command, EngineState } from '@cueclock/shared';
import { formatDuration, formatOffset } from '../shared/format';

interface Props {
  state: EngineState;
  sendCommand: (c: Command) => void;
}

const TIME_STEPS = [
  { label: '-5m', seconds: -300 },
  { label: '-1m', seconds: -60 },
  { label: '-10s', seconds: -10 },
  { label: '+10s', seconds: 10 },
  { label: '+1m', seconds: 60 },
  { label: '+5m', seconds: 300 },
];

const SPEED_STEPS = [-10, -5, -1, 1, 5, 10];

export function NowPlaying({ state, sendCommand }: Props) {
  const [speedInput, setSpeedInput] = useState('');
  const isIdle = state.mode === 'idle';
  const hasNextBlock = state.mode === 'block' && state.blockProjections.some((b) => b.status === 'upcoming');
  const neverStarted = !isIdle && !state.running && state.remainingSeconds === state.durationSeconds;

  function applySpeed(percent: number) {
    sendCommand({ type: 'setSpeed', speedPercent: percent });
  }

  return (
    <section className="panel now-playing">
      <h2>Now Playing</h2>

      <div className={`now-playing__time now-playing__time--${state.colorState}`}>
        {isIdle ? '—:—' : formatDuration(state.remainingSeconds)}
      </div>

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
          <span className="now-playing__hint">Start a quick timer or a schedule block below.</span>
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

      {!isIdle && (
        <>
          <div className="now-playing__row">
            <span className="now-playing__row-label">Adjust time</span>
            <div className="now-playing__buttons">
              {TIME_STEPS.map((step) => (
                <button
                  key={step.label}
                  className="btn btn--chip"
                  onClick={() => sendCommand({ type: 'addSeconds', seconds: step.seconds })}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>

          <div className="now-playing__row">
            <span className="now-playing__row-label">Speed ({state.speedPercent}%)</span>
            <div className="now-playing__buttons">
              {SPEED_STEPS.map((delta) => (
                <button
                  key={delta}
                  className="btn btn--chip"
                  onClick={() => applySpeed(state.speedPercent + delta)}
                >
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
        </>
      )}
    </section>
  );
}
