import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { EnginePersistedState } from './engine';
import { DEFAULT_THRESHOLDS } from '@cueclock/shared';

function defaultDataDir(): string {
  return process.env.CUECLOCK_DATA_DIR ?? path.join(os.homedir(), '.cueclock');
}

export class Store {
  private readonly filePath: string;

  constructor(dataDir: string = defaultDataDir()) {
    fs.mkdirSync(dataDir, { recursive: true });
    this.filePath = path.join(dataDir, 'store.json');
  }

  load(): Partial<EnginePersistedState> {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        presets: Array.isArray(parsed.presets) ? parsed.presets : [],
        quickMessages: Array.isArray(parsed.quickMessages) ? parsed.quickMessages : [],
        schedules: Array.isArray(parsed.schedules) ? parsed.schedules : [],
        thresholds: parsed.thresholds ?? { ...DEFAULT_THRESHOLDS },
      };
    } catch {
      return {};
    }
  }

  save(state: EnginePersistedState) {
    const tmpPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tmpPath, this.filePath);
  }
}
