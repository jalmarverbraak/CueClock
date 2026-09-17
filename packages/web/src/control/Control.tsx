import { useEffect, useState } from 'react';
import { useEngineSocket } from '../shared/useEngineSocket';
import { formatClock } from '../shared/format';
import { ConnectionBar } from './ConnectionBar';
import { ErrorToast } from './ErrorToast';
import { NowPlaying } from './NowPlaying';
import { QuickTimer } from './QuickTimer';
import { ScheduleManager } from './ScheduleManager';
import { MessagePanel } from './MessagePanel';
import { SettingsView } from './SettingsView';
import './control.css';

type View = 'dashboard' | 'settings';

export function Control() {
  const { state, status, lastError, sendCommand, clearError } = useEngineSocket();
  const [view, setView] = useState<View>('dashboard');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="control">
      <nav className="sidebar">
        <div className="sidebar__logo">◈</div>
        <div className="sidebar__nav">
          <button
            className={`sidebar__nav-btn ${view === 'dashboard' ? 'active' : ''}`}
            title="Dashboard"
            onClick={() => setView('dashboard')}
          >
            ▤
          </button>
          <button
            className={`sidebar__nav-btn ${view === 'settings' ? 'active' : ''}`}
            title="Settings"
            onClick={() => setView('settings')}
          >
            ⚙
          </button>
        </div>
      </nav>

      <div className="control__main">
        <ConnectionBar status={status} />
        <ErrorToast message={lastError} onDismiss={clearError} />

        {!state ? (
          <div className="control__loading">Connecting to CueClock…</div>
        ) : view === 'dashboard' ? (
          <div className="dashboard">
            <div className="dashboard__main">
              <div className="dashboard__clock">
                <div className="dashboard__clock-time">
                  {formatClock(now, { seconds: true, use24h: state.timerSettings.use24HourClock })}
                </div>
                <div className="dashboard__clock-label">Current Time</div>
              </div>
              <NowPlaying state={state} sendCommand={sendCommand} />
              <QuickTimer state={state} sendCommand={sendCommand} />
              <MessagePanel state={state} sendCommand={sendCommand} />
            </div>
            <div className="dashboard__schedule">
              <ScheduleManager state={state} sendCommand={sendCommand} />
            </div>
          </div>
        ) : (
          <SettingsView state={state} sendCommand={sendCommand} />
        )}
      </div>
    </div>
  );
}
