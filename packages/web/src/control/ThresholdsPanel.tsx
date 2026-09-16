import { useState } from 'react';
import type { Command, EngineState } from '@cueclock/shared';

interface Props {
  state: EngineState;
  sendCommand: (c: Command) => void;
}

export function ThresholdsPanel({ state, sendCommand }: Props) {
  const [warning, setWarning] = useState(String(state.thresholds.warningAtSeconds / 60));
  const [critical, setCritical] = useState(String(state.thresholds.criticalAtSeconds));

  function apply() {
    const warningAtSeconds = Math.round(Number(warning) * 60);
    const criticalAtSeconds = Math.round(Number(critical));
    if (Number.isNaN(warningAtSeconds) || Number.isNaN(criticalAtSeconds)) return;
    sendCommand({ type: 'setThresholds', thresholds: { warningAtSeconds, criticalAtSeconds } });
  }

  return (
    <section className="panel">
      <h2>Warning Colors</h2>
      <p className="panel__hint">Display turns amber, then red, as time runs out; it turns fully red once past zero.</p>

      <div className="toggle-row">
        <div className="toggle-row__label">Turn amber at</div>
        <div className="thresholds__field">
          <input className="text-input text-input--small" value={warning} onChange={(e) => setWarning(e.target.value)} />
          <span className="toggle-row__hint">min remaining</span>
        </div>
      </div>
      <div className="toggle-row">
        <div className="toggle-row__label">Turn red at</div>
        <div className="thresholds__field">
          <input className="text-input text-input--small" value={critical} onChange={(e) => setCritical(e.target.value)} />
          <span className="toggle-row__hint">sec remaining</span>
        </div>
      </div>
      <div className="thresholds__apply">
        <button className="btn btn--secondary" onClick={apply}>
          Apply
        </button>
      </div>
    </section>
  );
}
