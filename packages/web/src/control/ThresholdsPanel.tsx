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
      <div className="thresholds__row">
        <label>
          Turn amber at
          <input className="text-input text-input--small" value={warning} onChange={(e) => setWarning(e.target.value)} /> min remaining
        </label>
        <label>
          Turn red at
          <input className="text-input text-input--small" value={critical} onChange={(e) => setCritical(e.target.value)} /> sec remaining
        </label>
        <button className="btn btn--secondary" onClick={apply}>
          Apply
        </button>
      </div>
    </section>
  );
}
