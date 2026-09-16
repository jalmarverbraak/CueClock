import type { Command, DisplaySettings, DisplayTextStyle, EngineState } from '@cueclock/shared';
import { ThresholdsPanel } from './ThresholdsPanel';
import { DisplayStyleEditor } from './DisplayStyleEditor';

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
        <p className="panel__hint">
          Controls what the fullscreen output screens show. The Timer/Clock switch lives on the main
          dashboard next to the timer, since it's used often.
        </p>

        <div className="toggle-row">
          <div>
            <div className="toggle-row__label">Show schedule block name</div>
            <div className="toggle-row__hint">Shows the active block's name below the timer</div>
          </div>
          <Switch on={settings.showBlockName} onToggle={() => update({ showBlockName: !settings.showBlockName })} />
        </div>

        <div className="toggle-row">
          <div>
            <div className="toggle-row__label">Show next block</div>
            <div className="toggle-row__hint">Shows the upcoming block's name and duration, right under the current one</div>
          </div>
          <Switch on={settings.showNextBlock} onToggle={() => update({ showNextBlock: !settings.showNextBlock })} />
        </div>

        <div className="toggle-row">
          <div>
            <div className="toggle-row__label">Show time of day below timer</div>
            <div className="toggle-row__hint">Small clock (hours and minutes) under the countdown</div>
          </div>
          <Switch on={settings.showTimeBelow} onToggle={() => update({ showTimeBelow: !settings.showTimeBelow })} />
        </div>
      </section>

      <section className="panel">
        <h2>Display Appearance</h2>
        <p className="panel__hint">
          Font, color, size, and position - set independently for the timer and the time-of-day readout.
          Google Fonts load on demand and need internet the first time they're used; System fonts always
          work offline.
        </p>

        <DisplayStyleEditor
          title="Timer / Clock readout"
          style={settings.timerStyle}
          allowAuto
          onChange={(timerStyle: DisplayTextStyle) => update({ timerStyle })}
        />
        <DisplayStyleEditor
          title="Time-of-day below timer"
          style={settings.timeBelowStyle}
          allowAuto={false}
          onChange={(timeBelowStyle: DisplayTextStyle) => update({ timeBelowStyle })}
        />
      </section>

      <section className="panel">
        <h2>Timer Effects</h2>
        <div className="toggle-row">
          <div>
            <div className="toggle-row__label">Flash when over time</div>
            <div className="toggle-row__hint">Pulses the timer digits once it goes into overtime (the text is already red either way)</div>
          </div>
          <Switch on={settings.flashOnOvertime} onToggle={() => update({ flashOnOvertime: !settings.flashOnOvertime })} />
        </div>
      </section>

      <ThresholdsPanel state={state} sendCommand={sendCommand} />
    </div>
  );
}
