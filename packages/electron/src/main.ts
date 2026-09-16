import { app, BrowserWindow, Menu, screen, dialog } from 'electron';
import path from 'node:path';
import type { createServer as CreateServerFn } from '@cueclock/server';

// The server is bundled to a single dependency-free file at build time (see
// scripts/prepare-vendor.js) so packaging doesn't have to fight npm-workspace
// symlinks - see packages/electron/package.json's "build.files".
const { createServer } = require(path.join(__dirname, '../vendor/server-bundle.js')) as {
  createServer: typeof CreateServerFn;
};

const BASE_PORT = 8420;
const VENDOR_WEB_DIR = path.join(__dirname, '../vendor/web');

let controlWindow: BrowserWindow | null = null;
let displayWindow: BrowserWindow | null = null;
let resolvedPort = BASE_PORT;

function listenWithFallback(
  httpServer: import('node:http').Server,
  port: number,
  attemptsLeft = 10,
): Promise<number> {
  return new Promise((resolve, reject) => {
    httpServer.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
        resolve(listenWithFallback(httpServer, port + 1, attemptsLeft - 1));
      } else {
        reject(err);
      }
    });
    httpServer.listen(port, '0.0.0.0', () => resolve(port));
  });
}

async function startServer() {
  const { httpServer } = createServer({
    dataDir: app.getPath('userData'),
    webDist: VENDOR_WEB_DIR,
  });
  resolvedPort = await listenWithFallback(httpServer, BASE_PORT);
  return resolvedPort;
}

function createControlWindow(port: number) {
  controlWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    title: 'CueClock — Control',
  });
  controlWindow.loadURL(`http://localhost:${port}/control.html`);
  controlWindow.on('closed', () => {
    controlWindow = null;
  });
}

function openDisplayWindow(port: number, { fullscreenOnSecondary }: { fullscreenOnSecondary: boolean }) {
  if (displayWindow) {
    displayWindow.focus();
    return;
  }

  const displays = screen.getAllDisplays();
  const secondary = displays.find((d) => d.id !== screen.getPrimaryDisplay().id);
  const target = fullscreenOnSecondary && secondary ? secondary : screen.getPrimaryDisplay();

  displayWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: 1280,
    height: 720,
    title: 'CueClock — Display',
    autoHideMenuBar: true,
  });
  displayWindow.loadURL(`http://localhost:${port}/display.html`);
  if (fullscreenOnSecondary && secondary) {
    displayWindow.setFullScreen(true);
  }
  displayWindow.on('closed', () => {
    displayWindow = null;
  });
}

function buildMenu(port: number) {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'CueClock',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'Display',
        submenu: [
          {
            label: 'Open on Second Monitor (Fullscreen)',
            click: () => openDisplayWindow(port, { fullscreenOnSecondary: true }),
          },
          {
            label: 'Open in a Window',
            click: () => openDisplayWindow(port, { fullscreenOnSecondary: false }),
          },
        ],
      },
      {
        label: 'Network',
        submenu: [
          {
            label: 'Show Network Info…',
            click: async () => {
              const res = await fetch(`http://localhost:${port}/api/info`);
              const info = (await res.json()) as { lanUrls: string[] };
              const lines =
                info.lanUrls.length > 0
                  ? info.lanUrls.map((u) => `${u}/control.html  (control)\n${u}/display.html  (display)`).join('\n\n')
                  : 'No network interfaces found - only this computer can connect.';
              dialog.showMessageBox({
                type: 'info',
                title: 'CueClock Network Info',
                message: 'Open these addresses from other devices on the same network:',
                detail: lines,
              });
            },
          },
        ],
      },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
    ]),
  );
}

app.whenReady().then(async () => {
  const port = await startServer();
  createControlWindow(port);
  buildMenu(port);
  if (screen.getAllDisplays().length > 1) {
    openDisplayWindow(port, { fullscreenOnSecondary: true });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow(port);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
