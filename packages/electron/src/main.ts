import { app, BrowserWindow, Menu, screen, dialog } from 'electron';
import type { Display, MenuItemConstructorOptions } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import type { createServer as CreateServerFn } from '@cueclock/server';
import { loadPrefs, savePrefs, type ElectronPrefs } from './prefs';

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
let keyFillWindow: BrowserWindow | null = null;
let resolvedPort = BASE_PORT;
let prefs: ElectronPrefs = {};

/** A short, human-identifiable label for a monitor - resolution and position, since Electron
 * doesn't reliably expose a real display name on every platform. */
function describeDisplay(d: Display, index: number): string {
  const primary = d.id === screen.getPrimaryDisplay().id ? ' · Primary' : '';
  return `Display ${index + 1} — ${d.size.width}×${d.size.height} at (${d.bounds.x}, ${d.bounds.y})${primary}`;
}

/** Resolves a saved preferred Display.id to its current index in screen.getAllDisplays(),
 * if that monitor is still connected - otherwise falls back to the given default resolver
 * (e.g. "first non-primary"), so unplugging a monitor never leaves outputs unable to open. */
function resolveDisplayIndex(preferredId: number | undefined, fallback: () => number): number | null {
  const displays = screen.getAllDisplays();
  if (preferredId !== undefined) {
    const idx = displays.findIndex((d) => d.id === preferredId);
    if (idx !== -1) return idx;
  }
  const fallbackIdx = fallback();
  return fallbackIdx === -1 ? null : fallbackIdx;
}

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
    // Matches the Control panel's own background so there's never a mismatched
    // native-window color visible during load/resize before the page paints.
    backgroundColor: '#0a0b0d',
  });
  controlWindow.loadURL(`http://localhost:${port}/control.html`);
  controlWindow.on('closed', () => {
    controlWindow = null;
    // Control is the operator's only way to drive the show - closing it should end the
    // whole session, including any fullscreen output windows on other monitors, rather
    // than leaving them running with nothing controlling them (or, on macOS, leaving
    // the app alive in the dock with no windows).
    app.quit();
  });
}

/** Opens (or focuses) an output window loading display.html, optionally fullscreened on a specific monitor. */
function openOutputWindow(options: {
  existing: BrowserWindow | null;
  getWindow: () => BrowserWindow | null;
  setWindow: (w: BrowserWindow | null) => void;
  port: number;
  urlPath: string;
  title: string;
  preferredDisplayIndex: number | null;
}): BrowserWindow {
  if (options.existing) {
    options.existing.focus();
    return options.existing;
  }

  const displays = screen.getAllDisplays();
  const target =
    options.preferredDisplayIndex !== null ? displays[options.preferredDisplayIndex] : undefined;
  const bounds = target?.bounds ?? screen.getPrimaryDisplay().bounds;

  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: 1280,
    height: 720,
    title: options.title,
    autoHideMenuBar: true,
    // These are stage-output windows, never a normal app window: no native title
    // bar/frame. Besides looking wrong, an OS title bar is a dark/black strip
    // that sits right above the content - exactly where it becomes visible once
    // the timer or clock is positioned at the top of the screen.
    frame: false,
    // Go fullscreen at creation time (when a target display was picked) rather
    // than via setFullScreen() after load, so there's no windowed frame ever
    // shown mid-transition on the way to fullscreen.
    fullscreen: !!target,
    // Matches display.html's own background (pure black, same as key/fill) so any
    // repaint before the page's own CSS background applies (or on displays where
    // fullscreen fails) never flashes a mismatched color through as a bar.
    backgroundColor: '#000000',
    webPreferences: {
      // These windows are almost never focused (the operator lives in Control) and
      // often sit on a secondary/projector output. Chromium throttles rendering on
      // windows it considers backgrounded to save power, which can leave stale
      // (black) pixels around whatever small region is still forcing a repaint -
      // e.g. a ticking clock - while the rest of the frame never gets redrawn.
      backgroundThrottling: false,
    },
  });
  win.loadURL(`http://localhost:${options.port}${options.urlPath}`);
  // Frameless windows have no close button - Escape is the operator's way out.
  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') win.close();
  });
  // Guard against a stale/replaced window's own 'closed' event firing after a newer
  // window has already taken its place (e.g. closing+reopening on a different monitor
  // via setPreferredDisplay) and clobbering that newer window's reference back to null.
  win.on('closed', () => {
    if (options.getWindow() === win) options.setWindow(null);
  });
  options.setWindow(win);
  return win;
}

function openDisplayWindow(port: number, { fullscreenOnSecondary }: { fullscreenOnSecondary: boolean }) {
  const index = fullscreenOnSecondary
    ? resolveDisplayIndex(prefs.preferredDisplayId, () => {
        const displays = screen.getAllDisplays();
        return displays.findIndex((d) => d.id !== screen.getPrimaryDisplay().id);
      })
    : null;
  displayWindow = openOutputWindow({
    existing: displayWindow,
    getWindow: () => displayWindow,
    setWindow: (w) => (displayWindow = w),
    port,
    urlPath: '/display.html',
    title: 'CueClock — Display',
    preferredDisplayIndex: index,
  });
}

function openKeyFillWindow(port: number, { fullscreenOnThird }: { fullscreenOnThird: boolean }) {
  const index = fullscreenOnThird
    ? resolveDisplayIndex(prefs.preferredKeyFillDisplayId, () => {
        const displays = screen.getAllDisplays();
        const primaryId = screen.getPrimaryDisplay().id;
        const nonPrimaryIndexes = displays.map((d, i) => i).filter((i) => displays[i].id !== primaryId);
        return nonPrimaryIndexes[1] ?? nonPrimaryIndexes[0] ?? -1;
      })
    : null;
  keyFillWindow = openOutputWindow({
    existing: keyFillWindow,
    getWindow: () => keyFillWindow,
    setWindow: (w) => (keyFillWindow = w),
    port,
    urlPath: '/display.html?mode=key',
    title: 'CueClock — Key/Fill Output',
    preferredDisplayIndex: index,
  });
}

/** Sets which monitor an output defaults to, persists it, and - if that output window is
 * already open - closes and reopens it there immediately so the change is visible right away. */
function setPreferredDisplay(kind: 'display' | 'keyFill', displayId: number, port: number) {
  if (kind === 'display') {
    prefs.preferredDisplayId = displayId;
    savePrefs(app.getPath('userData'), prefs);
    if (displayWindow) {
      const stale = displayWindow;
      displayWindow = null; // avoid openDisplayWindow below racing the 'closed' event and reusing the closing window
      stale.close();
      openDisplayWindow(port, { fullscreenOnSecondary: true });
    }
  } else {
    prefs.preferredKeyFillDisplayId = displayId;
    savePrefs(app.getPath('userData'), prefs);
    if (keyFillWindow) {
      const stale = keyFillWindow;
      keyFillWindow = null;
      stale.close();
      openKeyFillWindow(port, { fullscreenOnThird: true });
    }
  }
  buildMenu(port);
}

// Update metadata (app-update.yml) only exists in a real packaged build - electron-builder
// writes it from the "publish" config at package time. In a dev/unpacked run there's nothing
// to check against, so we skip it entirely rather than surface a confusing file-not-found error.
//
// Caveat: these builds aren't code-signed (see the release workflow). On Windows and Linux
// (AppImage) that's fine - checking, downloading, and installing all work unsigned. On macOS,
// Squirrel.Mac (the mechanism electron-updater uses there) generally expects a signed app to
// safely apply an update in place; an unsigned build may check and download fine but fail on
// the final install step. Signing later removes this gap without any code changes here.
let checkingForUpdatesManually = false;

function reportUpdateError(err: Error) {
  if (!checkingForUpdatesManually) return;
  checkingForUpdatesManually = false;
  dialog.showMessageBox({
    type: 'error',
    title: 'Update check failed',
    message: 'Could not check for updates.',
    detail: err.message,
  });
}

autoUpdater.on('error', reportUpdateError);

autoUpdater.on('update-not-available', () => {
  if (!checkingForUpdatesManually) return;
  checkingForUpdatesManually = false;
  dialog.showMessageBox({
    type: 'info',
    title: 'No update available',
    message: 'You already have the latest version of CueClock.',
  });
});

autoUpdater.on('update-available', (info) => {
  if (!checkingForUpdatesManually) return;
  checkingForUpdatesManually = false;
  dialog.showMessageBox({
    type: 'info',
    title: 'Update available',
    message: `CueClock ${info.version} is downloading in the background.`,
    detail: "You'll be asked to restart once it's ready to install.",
  });
});

autoUpdater.on('update-downloaded', (info) => {
  checkingForUpdatesManually = false;
  dialog
    .showMessageBox({
      type: 'question',
      buttons: ['Restart && Install', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: `CueClock ${info.version} has been downloaded.`,
      detail: 'Restart now to install it, or keep working and it will install the next time you quit.',
    })
    .then((result) => {
      if (result.response === 0) autoUpdater.quitAndInstall();
    });
});

function checkForUpdates(options: { manual: boolean }) {
  if (!app.isPackaged) {
    if (options.manual) {
      dialog.showMessageBox({
        type: 'info',
        title: 'Check for Updates',
        message: 'Updates can only be checked from a packaged build, not this development run.',
      });
    }
    return;
  }
  checkingForUpdatesManually = options.manual;
  autoUpdater.checkForUpdates().catch((err) => reportUpdateError(err));
}

/** Builds a submenu listing every connected monitor as a checkable item for choosing which
 * one an output defaults to opening fullscreen on. */
function buildDisplayPickerSubmenu(kind: 'display' | 'keyFill', port: number): MenuItemConstructorOptions[] {
  const displays = screen.getAllDisplays();
  const preferredId = kind === 'display' ? prefs.preferredDisplayId : prefs.preferredKeyFillDisplayId;
  return displays.map((d, i) => ({
    label: describeDisplay(d, i),
    type: 'checkbox',
    checked: preferredId === d.id,
    click: () => setPreferredDisplay(kind, d.id, port),
  }));
}

function buildMenu(port: number) {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'CueClock',
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          {
            label: 'Check for Updates…',
            click: () => checkForUpdates({ manual: true }),
          },
          { type: 'separator' },
          { role: 'quit' },
        ],
      },
      {
        label: 'Outputs',
        submenu: [
          {
            label: 'Open Display on Second Monitor (Fullscreen)',
            click: () => openDisplayWindow(port, { fullscreenOnSecondary: true }),
          },
          {
            label: 'Open Display in a Window',
            click: () => openDisplayWindow(port, { fullscreenOnSecondary: false }),
          },
          { type: 'separator' },
          {
            label: 'Open Key/Fill on Third Monitor (Fullscreen)',
            click: () => openKeyFillWindow(port, { fullscreenOnThird: true }),
          },
          {
            label: 'Open Key/Fill in a Window',
            click: () => openKeyFillWindow(port, { fullscreenOnThird: false }),
          },
          { type: 'separator' },
          {
            label: 'Close Display Window',
            click: () => displayWindow?.close(),
          },
          {
            label: 'Close Key/Fill Window',
            click: () => keyFillWindow?.close(),
          },
          { type: 'separator' },
          {
            label: 'Default Display Output To',
            submenu: buildDisplayPickerSubmenu('display', port),
          },
          {
            label: 'Default Key/Fill Output To',
            submenu: buildDisplayPickerSubmenu('keyFill', port),
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
  prefs = loadPrefs(app.getPath('userData'));
  const port = await startServer();
  createControlWindow(port);
  buildMenu(port);
  if (screen.getAllDisplays().length > 1) {
    openDisplayWindow(port, { fullscreenOnSecondary: true });
  }

  // Keeps the "Default Display/Key-Fill Output To" submenus (and their checkmarks) in
  // sync with monitors actually being plugged/unplugged, rather than only refreshing
  // the next time some other action happens to rebuild the menu.
  screen.on('display-added', () => buildMenu(port));
  screen.on('display-removed', () => buildMenu(port));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow(port);
  });

  checkForUpdates({ manual: false });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
