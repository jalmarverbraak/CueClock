import { useEffect, useState } from 'react';
import type { ConnectionStatus } from '../shared/useEngineSocket';

export function ConnectionBar({ status }: { status: ConnectionStatus }) {
  const [lanUrls, setLanUrls] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/info')
      .then((r) => r.json())
      .then((info) => setLanUrls(info.lanUrls ?? []))
      .catch(() => undefined);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar__title">CueClock</div>
      <div className={`topbar__status topbar__status--${status}`}>
        <span className="topbar__dot" /> {status === 'open' ? 'Connected' : 'Reconnecting…'}
      </div>
      {lanUrls.length > 0 && (
        <div className="topbar__lan" title="Open the Display or this Control panel from another device on the same network using one of these addresses">
          Display on another device: {lanUrls.map((u) => `${u}/display.html`).join(' or ')}
        </div>
      )}
    </header>
  );
}
