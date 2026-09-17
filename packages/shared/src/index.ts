// Shared types between server, web (Control + Display), and electron shell.
// This is the contract clients and the server agree on over WebSocket/REST.

export type TimerMode = 'idle' | 'quick' | 'block' | 'countup';

export type ColorState = 'normal' | 'warning' | 'critical' | 'overtime';

export interface ColorThresholds {
  /** Seconds remaining at/below which the display turns to the "warning" color (e.g. yellow). */
  warningAtSeconds: number;
  /** Seconds remaining at/below which the display turns to the "critical" color (e.g. red). */
  criticalAtSeconds: number;
}

export const DEFAULT_THRESHOLDS: ColorThresholds = {
  warningAtSeconds: 120,
  criticalAtSeconds: 30,
};

export interface TimerSettings {
  /** Whether a running timer automatically pauses itself at 00:00 instead of continuing into overtime (negative/minus time). */
  stopAtZero: boolean;
  /** Whether wall-clock times (the clock display, ends-at, schedule times) render in 24-hour or 12-hour format. */
  use24HourClock: boolean;
}

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  stopAtZero: false,
  use24HourClock: false,
};

export interface ScheduleBlock {
  id: string;
  name: string;
  /** Always resolved at save time from whichever of duration/start/end the operator provided - the sole driver of playback. */
  durationSeconds: number;
  /** Optional planned start-of-day anchor (minutes since midnight, 0-1439), purely for showing delay - never auto-advances anything. */
  startTimeMinutes: number | null;
  /** Optional planned end-of-day anchor (minutes since midnight, 0-1439), purely for showing delay - never auto-advances anything. */
  endTimeMinutes: number | null;
}

export interface Schedule {
  id: string;
  name: string;
  blocks: ScheduleBlock[];
}

/** Computed (derived, not stored) projection for one block in the running schedule. */
export interface BlockProjection {
  blockId: string;
  name: string;
  durationSeconds: number;
  status: 'done' | 'active' | 'upcoming';
  /** Actual elapsed seconds spent on this block, only meaningful once status is 'done' or 'active'. */
  actualElapsedSeconds: number | null;
  /** Projected/actual start time, epoch ms. */
  projectedStartMs: number | null;
  /** Projected/actual end time, epoch ms. */
  projectedEndMs: number | null;
  /** Today's resolved wall-clock time for this block's planned start anchor, if it has one. */
  anchoredStartMs: number | null;
  /** projectedStartMs - anchoredStartMs, in seconds. Positive = running later than planned. Null if no anchor. */
  delaySeconds: number | null;
}

export interface Preset {
  id: string;
  name: string;
  durationSeconds: number;
}

export type DisplayMode = 'timer' | 'clock';

/** A 3x3 anchor grid for freely placing an element on the display. */
export type DisplayPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * 'system' fonts render with zero network dependency (important - this app runs at live
 * events where the venue may have no internet). 'google' fonts are loaded on demand from
 * Google Fonts by whichever client (Display) actually selects one; if that fails/is
 * offline, the browser falls back to the trailing generic family in `css`.
 */
export const DISPLAY_FONT_FAMILIES = [
  { id: 'system', label: 'System Default', source: 'system', css: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
  { id: 'mono', label: 'Monospace', source: 'system', css: "'SF Mono', 'Consolas', 'Menlo', monospace" },
  { id: 'condensed', label: 'Condensed', source: 'system', css: "'Arial Narrow', 'Helvetica Neue Condensed', sans-serif" },
  { id: 'serif', label: 'Serif', source: 'system', css: "Georgia, 'Times New Roman', serif" },
  { id: 'impact', label: 'Impact / Display', source: 'system', css: "Impact, Haettenschweiler, 'Arial Black', sans-serif" },
  { id: 'verdana', label: 'Verdana', source: 'system', css: 'Verdana, Geneva, sans-serif' },
  { id: 'trebuchet', label: 'Trebuchet MS', source: 'system', css: "'Trebuchet MS', sans-serif" },
  { id: 'courier', label: 'Courier', source: 'system', css: "'Courier New', Courier, monospace" },
  {
    id: 'google-roboto-mono',
    label: 'Roboto Mono (Google)',
    source: 'google',
    googleFamily: 'Roboto Mono',
    css: "'Roboto Mono', 'SF Mono', monospace",
  },
  {
    id: 'google-oswald',
    label: 'Oswald (Google)',
    source: 'google',
    googleFamily: 'Oswald',
    css: "'Oswald', 'Arial Narrow', sans-serif",
  },
  {
    id: 'google-bebas-neue',
    label: 'Bebas Neue (Google)',
    source: 'google',
    googleFamily: 'Bebas Neue',
    css: "'Bebas Neue', Impact, sans-serif",
  },
  {
    id: 'google-anton',
    label: 'Anton (Google)',
    source: 'google',
    googleFamily: 'Anton',
    css: "'Anton', Impact, sans-serif",
  },
  {
    id: 'google-archivo-black',
    label: 'Archivo Black (Google)',
    source: 'google',
    googleFamily: 'Archivo Black',
    css: "'Archivo Black', 'Arial Black', sans-serif",
  },
  {
    id: 'google-teko',
    label: 'Teko (Google)',
    source: 'google',
    googleFamily: 'Teko',
    css: "'Teko', 'Arial Narrow', sans-serif",
  },
  {
    id: 'google-orbitron',
    label: 'Orbitron (Google)',
    source: 'google',
    googleFamily: 'Orbitron',
    css: "'Orbitron', 'SF Mono', monospace",
  },
  {
    id: 'google-barlow-condensed',
    label: 'Barlow Condensed (Google)',
    source: 'google',
    googleFamily: 'Barlow Condensed',
    css: "'Barlow Condensed', 'Arial Narrow', sans-serif",
  },
  {
    // No fixed googleFamily/css - resolved at runtime from DisplayTextStyle.customGoogleFont.
    id: 'custom',
    label: 'Custom Google Font…',
    source: 'google-custom',
    css: 'sans-serif',
  },
] as const;

export type DisplayFontFamily = (typeof DISPLAY_FONT_FAMILIES)[number]['id'];

/** Weights actually requested from Google Fonts and offered in the weight picker - most Google Fonts support this full range, and browsers safely ignore an axis a given family doesn't have. */
export const DISPLAY_FONT_WEIGHTS = [300, 400, 500, 600, 700, 800, 900] as const;
export type DisplayFontWeight = (typeof DISPLAY_FONT_WEIGHTS)[number];

export interface DisplayTextStyle {
  fontFamily: DisplayFontFamily;
  /** The Google Font family name to load/use when fontFamily is 'custom', e.g. "Montserrat". Ignored otherwise. */
  customGoogleFont: string | null;
  /** A CSS color, or 'auto' to keep the automatic normal/warning/critical/overtime coloring (only meaningful for the timer). */
  color: string;
  /** Percentage of the default size, e.g. 100 = default, 50 = half, 200 = double. */
  sizePercent: number;
  weight: DisplayFontWeight;
  /** Letter-spacing in em units. Can be negative (tighter, common for large display numerals) or positive (wider). */
  letterSpacingEm: number;
  position: DisplayPosition;
}

export interface DisplaySettings {
  /** Whether the display's main readout shows the countdown timer or the current time of day. */
  mode: DisplayMode;
  /** Whether the active schedule block's name is shown on the display. */
  showBlockName: boolean;
  /** Whether the current time of day is shown below the timer (only relevant when mode is 'timer'). */
  showTimeBelow: boolean;
  /** Whether the upcoming block's name/duration is shown, directly under the active block name. */
  showNextBlock: boolean;
  /** Whether the timer visually flashes (pulses) once it goes into overtime. Off by default - text still turns red either way. */
  flashOnOvertime: boolean;
  /** Style/position for the main readout (timer or clock, whichever is showing). */
  timerStyle: DisplayTextStyle;
  /** Style/position for the small time-of-day readout below the timer. */
  timeBelowStyle: DisplayTextStyle;
}

export const DEFAULT_TIMER_STYLE: DisplayTextStyle = {
  fontFamily: 'system',
  customGoogleFont: null,
  color: 'auto',
  sizePercent: 100,
  weight: 700,
  letterSpacingEm: -0.02,
  position: 'center',
};

export const DEFAULT_TIME_BELOW_STYLE: DisplayTextStyle = {
  fontFamily: 'system',
  customGoogleFont: null,
  color: '#f2f2f2',
  sizePercent: 100,
  weight: 400,
  letterSpacingEm: 0,
  position: 'bottom-center',
};

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  mode: 'timer',
  showBlockName: true,
  showTimeBelow: false,
  showNextBlock: true,
  flashOnOvertime: false,
  timerStyle: { ...DEFAULT_TIMER_STYLE },
  timeBelowStyle: { ...DEFAULT_TIME_BELOW_STYLE },
};

/** Fills in any missing fields (from an older persisted shape) with current defaults, so adding new DisplaySettings fields later never breaks an existing installation. */
export function normalizeDisplaySettings(input: Partial<DisplaySettings> | undefined | null): DisplaySettings {
  return {
    ...DEFAULT_DISPLAY_SETTINGS,
    ...input,
    timerStyle: { ...DEFAULT_TIMER_STYLE, ...input?.timerStyle },
    timeBelowStyle: { ...DEFAULT_TIME_BELOW_STYLE, ...input?.timeBelowStyle },
  };
}

export interface QuickMessage {
  id: string;
  text: string;
}

/**
 * The full, authoritative state broadcast to every client. Clients never compute
 * remaining time themselves from stale fields - the server ticks this over the
 * WebSocket at a steady rate and clients just render it. This keeps every screen
 * (control, display, remote browsers, Companion) perfectly in sync regardless of
 * client clock drift.
 */
export interface EngineState {
  mode: TimerMode;
  running: boolean;
  /** Current speed as a percentage, e.g. 100 = real time, 105 = 5% faster countdown. */
  speedPercent: number;
  /** Remaining seconds on the active timer. Negative means overtime. */
  remainingSeconds: number;
  /** Total duration in seconds the active timer was (last) set to (pre add/remove adjustments folded in). */
  durationSeconds: number;
  colorState: ColorState;
  thresholds: ColorThresholds;
  displaySettings: DisplaySettings;
  timerSettings: TimerSettings;

  activeSchedule: Schedule | null;
  activeBlockId: string | null;
  blockProjections: BlockProjection[];
  /** Positive = behind schedule (seconds), negative = ahead of schedule. Null if no schedule running. */
  scheduleOffsetSeconds: number | null;

  message: string | null;

  presets: Preset[];
  quickMessages: QuickMessage[];
  schedules: Schedule[];

  serverTimeMs: number;
}

// ---- REST/WebSocket command payloads ----

export type Command =
  | { type: 'startQuick'; durationSeconds: number }
  | { type: 'armQuick'; durationSeconds: number }
  | { type: 'startCountUp' }
  | { type: 'startBlock'; scheduleId: string; blockId: string }
  | { type: 'startSchedule'; scheduleId: string }
  | { type: 'nextBlock' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' }
  | { type: 'addSeconds'; seconds: number }
  | { type: 'setSpeed'; speedPercent: number }
  | { type: 'setMessage'; text: string | null }
  | { type: 'setThresholds'; thresholds: ColorThresholds }
  | { type: 'setTimerSettings'; settings: TimerSettings }
  | { type: 'setDisplaySettings'; settings: DisplaySettings }
  | { type: 'savePreset'; name: string; durationSeconds: number }
  | { type: 'deletePreset'; id: string }
  | { type: 'saveQuickMessage'; text: string }
  | { type: 'deleteQuickMessage'; id: string }
  | { type: 'saveSchedule'; schedule: Schedule }
  | { type: 'deleteSchedule'; id: string };

export interface ApiError {
  error: string;
}

export interface ServerInfo {
  version: string;
  lanUrls: string[];
  port: number;
}
