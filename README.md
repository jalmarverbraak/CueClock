# CueClock

A cross-platform stage/event countdown timer — one operator **Control** panel to run
the show, one fullscreen **Display** for the room, in sync over your local network.
Built as an Electron app (Mac/Windows/Linux) that's really just a small local web
server, so any browser, tablet, or second screen on the same network can also open
the Control panel or the Display.

## Features

- **Quick timers**: type a duration, start/pause/reset, always available regardless of any schedule.
- **Add/remove time**: adjust the running timer by any amount, live, including into overtime.
- **Speed control**: run the countdown at 95%, 105%, or any custom percentage — it actually changes how fast real time counts down, so it genuinely finishes earlier or later.
- **Schedule / rundown**: build a list of named blocks with durations. Start the first block, click **Next Block** to advance (regardless of whether the current one is over or under time), and see every block's projected start/end time update live as the show runs ahead or behind.
- **Ahead/behind schedule tracking**: a running total of how far off the plan you are, based on how blocks actually ran versus how long they were supposed to take.
- **Messages**: push a custom or saved quick message to the display at any time.
- **Warning colors & overtime**: configurable amber/red thresholds; the display flips fully red and counts up once a timer goes past zero.
- **Presets**: unnamed duration chips for one-click reuse — clicking one *arms* the quick timer at that duration (it shows on the display, paused) without starting it, so the operator decides exactly when to hit Start.
- **Timer/Clock display toggle**: the fullscreen output shows either the countdown or the current time of day, switched from Control → Settings. The display never shows any "CueClock" branding text - just the timer or the clock.
- **Key/Fill output**: any display window (including a dedicated third screen/window) can be flipped to a plain black-background/white-text mode for chroma-keying into a video switcher, via a subtle corner toggle on the display itself or a `?mode=key` URL.
- **Display settings**: independent toggles for whether the active schedule block's name is shown, and whether a small time-of-day readout appears below the countdown.
- **Bitfocus Companion integration**: a real Companion module (actions + live feedback + variables), plus a plain HTTP API for anyone who'd rather wire it up with Companion's built-in Generic HTTP module.

## Project layout

```
packages/
  shared/            Types shared between server, web, and Companion module
  server/             The engine (all timer/schedule logic + tests) and the HTTP/WebSocket API
  web/                 React app: control.html (operator) and display.html (fullscreen)
  electron/           Desktop shell: embeds the server, opens the Control/Display windows
  companion-module/    Bitfocus Companion module (actions, feedbacks, variables)
```

The **server is the single source of truth**. Every screen — the Electron windows,
a browser on another device, and the Companion module — is just a client of it over
REST/WebSocket. That's what keeps every screen perfectly in sync and makes "runs on
Mac, Windows, and everything" trivially true: it's all just a web page under the hood.

## Development

```bash
npm install

# Build the pieces the server serves / electron needs
npm run build -w packages/shared
npm run build -w packages/server
npm run build -w packages/web

# Run the server + web app standalone in a browser (fastest inner loop)
npm run dev:server        # http://localhost:8420
# in another terminal, for hot-reloading the web app:
npm run dev:web           # http://localhost:5173 (proxies /api and /ws to :8420)

# Run the engine's unit tests
npm run test

# Run the full Electron desktop app
npm run electron:dev
```

Open `http://localhost:8420/control.html` for the operator panel and
`http://localhost:8420/display.html` for the fullscreen display — from any device
on the same network, not just the machine running the server. The Control panel's
top bar shows the LAN address to use from other devices.

In the Electron app, the **Outputs** menu opens the Display on a second monitor
(fullscreen) or in a window, and separately opens a Key/Fill output (`display.html?mode=key`)
on a third monitor or in a window — useful for feeding a video switcher a plain
black/white keyable timer alongside the normal-color audience display.

## Building installers

```bash
npm run electron:build
```

This builds all packages, bundles the server into a single dependency-free file, and
runs `electron-builder` to produce a `.dmg` (mac), an NSIS installer (Windows), and an
`.AppImage`/`.deb` (Linux) under `packages/electron/release/`.

## Data storage

Presets, saved schedules, quick messages, and color thresholds are stored as JSON in:

- the Electron app's user data directory (e.g. `~/Library/Application Support/CueClock` on
  Mac, `%APPDATA%/CueClock` on Windows) when run as the desktop app, or
- `~/.cueclock/store.json` when running the server standalone (override with the
  `CUECLOCK_DATA_DIR` environment variable).

## HTTP / WebSocket API (for Companion, or anything else)

The server exposes the same API the Control panel itself uses.

**WebSocket** at `ws://<host>:<port>/ws` — on connect you immediately receive the
current state, and again on every change:

```json
{ "type": "state", "state": { "mode": "block", "remainingSeconds": 42.1, "colorState": "warning", "...": "..." } }
```

Send any `Command` (see `packages/shared/src/index.ts`) as a JSON text frame to control it directly.

**Simple GET actions** (ideal for Companion's built-in "Generic HTTP" module, or a plain button that just needs to hit a URL):

| Endpoint | Query params | Effect |
|---|---|---|
| `GET /api/actions/pause` | | Pause the running timer |
| `GET /api/actions/resume` | | Resume |
| `GET /api/actions/reset` | | Stop and clear the current timer/schedule |
| `GET /api/actions/next-block` | | Advance to the next schedule block |
| `GET /api/actions/add-time` | `seconds` (can be negative) | Add/remove time from the running timer |
| `GET /api/actions/set-speed` | `percent` (25-400) | Set the countdown speed |
| `GET /api/actions/set-message` | `text` | Show (or clear, with an empty string) a message on the display |
| `GET /api/actions/start-quick` | `seconds` | Start a quick timer |
| `GET /api/actions/start-schedule` | `id` | Start a saved schedule from block 1 |
| `GET /api/actions/jump-block` | `scheduleId`, `blockId` | Jump directly to a block in the running schedule |

**Full state / info**: `GET /api/state`, `GET /api/info` (version, port, LAN addresses).

### Bitfocus Companion module

`packages/companion-module` is a real Companion module (built and validated against
the actual `@companion-module/base` SDK). It gives you:

- **Actions**: Pause, Resume, Reset, Next Block, Add/Remove Time, Set Speed, Start
  Quick Timer, Send Message, Clear Message.
- **Feedback**: "Timer Color State" — a boolean feedback so a button lights up to
  match the display's current normal/warning/critical/overtime state (great for a
  traffic-light row of buttons).
- **Variables**: `remaining_time`, `remaining_seconds`, `color_state`,
  `active_block_name`, `schedule_offset`, `speed_percent`, `speed_minute_duration`,
  `finish_time`, `message` — all update live over the same WebSocket the Display
  uses. `finish_time` is the clock time the countdown will hit zero;
  `speed_minute_duration` is how long one countdown-minute takes in real time at
  the current speed.

It isn't published to the Companion module registry yet, so load it one of two ways:

**Option A — Companion's "Import module package" button** (simplest for day-to-day use):

```bash
cd packages/companion-module
npm install
npm run package
```

This produces `cueclock-<version>.tgz` in `packages/companion-module`. In Companion,
go to Modules → Import module package and select that file.

**Option B — developer mode** (for actively editing the module's code):

```bash
cd packages/companion-module
npm install
npm run build
```

Then point Companion's module developer mode at this folder (Companion looks for
`companion/manifest.json` + the built `dist/main.js`).

Either way, add a CueClock connection and set the host/port to match where CueClock
is running (default port `8420`).

## Notes on the schedule/offset model

- Blocks run in order by **duration**, not fixed clock times — starting block 2 late
  doesn't change block 1's numbers, and each block always gets its full planned
  duration when it starts.
- Overrunning a block only affects the "ahead/behind schedule" total once you click
  **Next Block** — while a block is still running, its own timer going red/negative
  already tells you it's over, live.
- Every upcoming block's projected start/end time is recalculated continuously from
  the currently active block's live progress, so the rundown always reflects "if we
  keep going at this pace."
