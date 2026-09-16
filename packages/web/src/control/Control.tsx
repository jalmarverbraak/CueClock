import { useEngineSocket } from '../shared/useEngineSocket';
import { ConnectionBar } from './ConnectionBar';
import { ErrorToast } from './ErrorToast';
import { NowPlaying } from './NowPlaying';
import { QuickTimer } from './QuickTimer';
import { ScheduleManager } from './ScheduleManager';
import { MessagePanel } from './MessagePanel';
import { ThresholdsPanel } from './ThresholdsPanel';
import './control.css';

export function Control() {
  const { state, status, lastError, sendCommand, clearError } = useEngineSocket();

  return (
    <div className="control">
      <ConnectionBar status={status} />
      <ErrorToast message={lastError} onDismiss={clearError} />

      <div className="control__toolbar">
        <a className="btn btn--secondary" href="/display.html" target="_blank" rel="noreferrer">
          Open Display ↗
        </a>
      </div>

      {!state ? (
        <div className="control__loading">Connecting to CueClock…</div>
      ) : (
        <div className="control__grid">
          <NowPlaying state={state} sendCommand={sendCommand} />
          <QuickTimer state={state} sendCommand={sendCommand} />
          <ScheduleManager state={state} sendCommand={sendCommand} />
          <MessagePanel state={state} sendCommand={sendCommand} />
          <ThresholdsPanel state={state} sendCommand={sendCommand} />
        </div>
      )}
    </div>
  );
}
