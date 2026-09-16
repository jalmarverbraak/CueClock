import { useEffect, useMemo, useState } from 'react';
import { useEngineSocket } from '../shared/useEngineSocket';
import { formatClock, formatDuration } from '../shared/format';
import './display.css';

export function Display() {
  const { state, status } = useEngineSocket();
  const [now, setNow] = useState(() => Date.now());
  const [keyFill, setKeyFill] = useState(() => new URLSearchParams(window.location.search).get('mode') === 'key');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const nextBlock = useMemo(
    () => state?.blockProjections.find((b) => b.status === 'upcoming') ?? null,
    [state],
  );
  const activeBlock = useMemo(
    () => state?.blockProjections.find((b) => b.status === 'active') ?? null,
    [state],
  );

  function enterFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  const displaySettings = state?.displaySettings;
  const colorState = keyFill ? 'normal' : state?.colorState ?? 'normal';
  const showClock = displaySettings?.mode === 'clock';

  return (
    <div
      className={`display display--${colorState} ${keyFill ? 'display--keyfill' : ''}`}
      onClick={enterFullscreen}
    >
      {status !== 'open' && (
        <div className="display__banner display__banner--error">
          Reconnecting to CueClock server…
        </div>
      )}

      <div className="display__main">
        <div className="display__timer">{showClock ? formatClock(now) : formatDuration(state?.remainingSeconds ?? 0)}</div>
        {!showClock && displaySettings?.showTimeBelow && (
          <div className="display__time-below">{formatClock(now)}</div>
        )}
        {!showClock && displaySettings?.showBlockName && activeBlock && (
          <div className="display__block-name">{activeBlock.name}</div>
        )}
      </div>

      {state?.message && <div className="display__message">{state.message}</div>}

      {!showClock && nextBlock && (
        <div className="display__next">
          Next: {nextBlock.name} ({formatDuration(nextBlock.durationSeconds)})
        </div>
      )}

      <button
        className="display__keyfill-toggle"
        title={keyFill ? 'Switch to normal color output' : 'Switch to black & white key/fill output'}
        onClick={(e) => {
          e.stopPropagation();
          setKeyFill((v) => !v);
        }}
      >
        {keyFill ? '◐' : '◑'}
      </button>
    </div>
  );
}
