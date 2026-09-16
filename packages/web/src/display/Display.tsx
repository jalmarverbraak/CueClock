import { useEffect, useMemo, useState } from 'react';
import { useEngineSocket } from '../shared/useEngineSocket';
import { formatClock, formatDuration } from '../shared/format';
import './display.css';

const COLOR_LABEL: Record<string, string> = {
  normal: 'On time',
  warning: 'Wrap up soon',
  critical: 'Almost out of time',
  overtime: 'Over time',
};

export function Display() {
  const { state, status } = useEngineSocket();
  const [now, setNow] = useState(() => Date.now());
  const [fullscreenHint, setFullscreenHint] = useState(true);

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
    setFullscreenHint(false);
  }

  const colorState = state?.colorState ?? 'normal';
  const isIdle = !state || state.mode === 'idle';

  return (
    <div className={`display display--${colorState}`} onClick={fullscreenHint ? enterFullscreen : undefined}>
      {status !== 'open' && (
        <div className="display__banner display__banner--error">
          Reconnecting to CueClock server…
        </div>
      )}

      {fullscreenHint && (
        <div className="display__fullscreen-hint">Click anywhere to enter fullscreen</div>
      )}

      <div className="display__clock">{formatClock(now)}</div>

      <div className="display__main">
        {isIdle ? (
          <div className="display__idle">CueClock</div>
        ) : (
          <div className="display__timer">{formatDuration(state!.remainingSeconds)}</div>
        )}
        {!isIdle && <div className="display__status-label">{COLOR_LABEL[colorState]}</div>}
        {activeBlock && <div className="display__block-name">{activeBlock.name}</div>}
      </div>

      {state?.message && <div className="display__message">{state.message}</div>}

      {nextBlock && (
        <div className="display__next">
          Next: {nextBlock.name} ({formatDuration(nextBlock.durationSeconds)})
        </div>
      )}

      {state && state.speedPercent !== 100 && (
        <div className="display__speed">{state.speedPercent}% speed</div>
      )}
    </div>
  );
}
