import type { Command, DisplaySettings, EngineState } from '@cueclock/shared';
import { ThresholdsPanel } from './ThresholdsPanel';

interface Props {
  state: EngineState;
  sendCommand: (c: Command) => void;
}

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button className={`switch ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={onToggle} />
  );
}

export function SettingsView({ state, sendCommand }: Props) {
  const settings = state.displaySettings;

  function update(patch: Partial<DisplaySettings>) {
    sendCommand({ type: 'setDisplaySettings', settings: { ...settings, ...patch } });
  }

  return (
    <div className="settings">
      <section className="panel">
        <h2>Display</h2>
        <p className="panel__hint">Controls what the fullscreen output screens show.</p>

        <div className="toggle-row">
          <div>
            <div className="toggle-row__label">Main readout</div>
            <div className="toggle-row__hint">Show the countdown timer, or the current time of day</div>
          </div>
          <div className="segmented">
            <button
              className={`segmented__option ${settings.mode === 'timer' ? 'active' : ''}`}
              onClick={() => update({ mode: 'timer' })}
            >
              Timer
            </button>
            <button
              className={`segmented__option ${settings.mode === 'clock' ? 'active' : ''}`}
              onClick={() => update({ mode: 'clock' })}
            >
              Clock
            </button>
          </div>
        </div>

        <div className="toggle-row">
          <div>
            <div className="toggle-row__label">Show schedule block name</div>
            <div className="toggle-row__hint">Shows the active block's name below the timer</div>
          </div>
          <Switch on={settings.showBlockName} onToggle={() => update({ showBlockName: !settings.showBlockName })} />
        </div>

        <div className="toggle-row">
          <div>
            <div className="toggle-row__label">Show time of day below timer</div>
            <div className="toggle-row__hint">Small clock (hours and minutes) under the countdown</div>
          </div>
          <Switch on={settings.showTimeBelow} onToggle={() => update({ showTimeBelow: !settings.showTimeBelow })} />
        </div>
      </section>

      <ThresholdsPanel state={state} sendCommand={sendCommand} />
    </div>
  );
}
