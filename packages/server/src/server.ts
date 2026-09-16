import express from 'express';
import cors from 'cors';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import { WebSocketServer, WebSocket } from 'ws';
import type { Command } from '@cueclock/shared';
import { Engine, EngineError } from './engine';
import { Store } from './store';
import { applyCommand } from './commands';

export interface CreateServerOptions {
  port?: number;
  dataDir?: string;
  /** Directory containing the built web app (control.html/display.html). Skips static hosting if omitted or missing. */
  webDist?: string;
}

const TICK_MS = 200;

export function createServer(options: CreateServerOptions = {}) {
  const store = new Store(options.dataDir);
  const engine = new Engine(Date.now, store.load());

  const app = express();
  app.use(cors());
  app.use(express.json());

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  function persist() {
    store.save(engine.getPersistedState());
  }

  function broadcastState() {
    const payload = JSON.stringify({ type: 'state', state: engine.getState() });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    });
  }

  function runCommand(command: Command) {
    applyCommand(engine, command);
    persist();
    broadcastState();
  }

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'state', state: engine.getState() }));

    socket.on('message', (raw) => {
      try {
        const command = JSON.parse(raw.toString()) as Command;
        runCommand(command);
      } catch (err) {
        const message = err instanceof EngineError || err instanceof Error ? err.message : 'Invalid command';
        socket.send(JSON.stringify({ type: 'error', message }));
      }
    });
  });

  const tickInterval = setInterval(() => {
    if (wss.clients.size === 0) return;
    if (engine.getState().mode === 'idle') return;
    broadcastState();
  }, TICK_MS);
  tickInterval.unref();

  app.get('/api/state', (_req, res) => {
    res.json(engine.getState());
  });

  app.post('/api/command', (req, res) => {
    try {
      runCommand(req.body as Command);
      res.json(engine.getState());
    } catch (err) {
      handleError(res, err);
    }
  });

  app.get('/api/info', (_req, res) => {
    res.json({
      version: '0.1.0',
      port: options.port ?? 8420,
      lanUrls: getLanUrls(options.port ?? 8420),
    });
  });

  registerActionRoutes(app, runCommand);

  if (options.webDist && fs.existsSync(options.webDist)) {
    app.use(express.static(options.webDist));
  }

  function handleError(res: express.Response, err: unknown) {
    if (err instanceof EngineError) {
      res.status(400).json({ error: err.message });
    } else {
      // eslint-disable-next-line no-console
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  return { app, httpServer, wss, engine };
}

/** Simple GET-friendly action routes, primarily for Bitfocus Companion (Generic HTTP module). */
function registerActionRoutes(app: express.Express, runCommand: (c: Command) => void) {
  const route = (
    method: 'get' | 'post',
    urlPath: string,
    build: (q: Record<string, string>) => Command,
  ) => {
    app[method](urlPath, (req, res) => {
      try {
        const query = { ...req.query, ...req.body } as Record<string, string>;
        runCommand(build(query));
        res.json({ ok: true });
      } catch (err) {
        if (err instanceof EngineError) res.status(400).json({ error: err.message });
        else res.status(500).json({ error: 'Internal server error' });
      }
    });
  };

  route('get', '/api/actions/pause', () => ({ type: 'pause' }));
  route('get', '/api/actions/resume', () => ({ type: 'resume' }));
  route('get', '/api/actions/reset', () => ({ type: 'reset' }));
  route('get', '/api/actions/next-block', () => ({ type: 'nextBlock' }));
  route('get', '/api/actions/add-time', (q) => ({
    type: 'addSeconds',
    seconds: Number(q.seconds ?? '0'),
  }));
  route('get', '/api/actions/set-speed', (q) => ({
    type: 'setSpeed',
    speedPercent: Number(q.percent ?? '100'),
  }));
  route('get', '/api/actions/set-message', (q) => ({
    type: 'setMessage',
    text: q.text ?? null,
  }));
  route('get', '/api/actions/start-quick', (q) => ({
    type: 'startQuick',
    durationSeconds: Number(q.seconds ?? '0'),
  }));
  route('get', '/api/actions/start-schedule', (q) => ({
    type: 'startSchedule',
    scheduleId: q.id,
  }));
  route('get', '/api/actions/jump-block', (q) => ({
    type: 'startBlock',
    scheduleId: q.scheduleId,
    blockId: q.blockId,
  }));
}

function getLanUrls(port: number): string[] {
  const interfaces = os.networkInterfaces();
  const urls: string[] = [];
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) {
        urls.push(`http://${entry.address}:${port}`);
      }
    }
  }
  return urls;
}
