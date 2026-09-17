// Small local preferences file for Electron-shell-only settings - things like "which
// physical monitor should the Display output default to" that have no meaning to a
// browser-based client (Control opened from another device on the LAN, say), so they
// don't belong in the server's own persisted EngineState/store.json.
import fs from 'node:fs';
import path from 'node:path';

export interface ElectronPrefs {
  /** Electron Display.id of the monitor the Display output should default to opening on. */
  preferredDisplayId?: number;
  /** Electron Display.id of the monitor the Key/Fill output should default to opening on. */
  preferredKeyFillDisplayId?: number;
}

export function loadPrefs(userDataDir: string): ElectronPrefs {
  try {
    const raw = fs.readFileSync(path.join(userDataDir, 'electron-prefs.json'), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function savePrefs(userDataDir: string, prefs: ElectronPrefs) {
  fs.writeFileSync(path.join(userDataDir, 'electron-prefs.json'), JSON.stringify(prefs, null, 2), 'utf-8');
}
