// Shared types between server, web (Control + Display), and electron shell.
// This is the contract clients and the server agree on over WebSocket/REST.

export type TimerMode = 'idle' | 'quick' | 'block';

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

export const DISPLAY_FONT_FAMILIES = [
  { id: 'system', label: 'System Default', css: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" },
  { id: 'mono', label: 'Monospace', css: "'SF Mono', 'Consolas', 'Menlo', monospace" },
  { id: 'condensed', label: 'Condensed', css: "'Arial Narrow', 'Helvetica Neue Condensed', sans-serif" },
  { id: 'serif', label: 'Serif', css: "Georgia, 'Times New Roman', serif" },
  { id: 'impact', label: 'Impact / Display', css: "Impact, Haettenschweiler, 'Arial Black', sans-serif" },
] as const;

export type DisplayFontFamily = (typeof DISPLAY_FONT_FAMILIES)[number]['id'];

export interface DisplayTextStyle {
  fontFamily: DisplayFontFamily;
  /** A CSS color, or 'auto' to keep the automatic normal/warning/critical/overtime coloring (only meaningful for the timer). */
  color: string;
  /** Percentage of the default size, e.g. 100 = default, 50 = half, 200 = double. */
  sizePercent: number;
  position: DisplayPosition;
}

export interface DisplaySettings {
  /** Whether the display's main readout shows the countdown timer or the current time of day. */
  mode: DisplayMode;
  /** Whether the active schedule block's name is shown on the display. */
  showBlockName: boolean;
  /** Whether the current time of day is shown below the timer (only relevant when mode is 'timer'). */
  showTimeBelow: boolean;
  /** Style/position for the main readout (timer or clock, whichever is showing). */
  timerStyle: DisplayTextStyle;
  /** Style/position for the small time-of-day readout below the timer. */
  timeBelowStyle: DisplayTextStyle;
}

export const DEFAULT_TIMER_STYLE: DisplayTextStyle = {
  fontFamily: 'system',
  color: 'auto',
  sizePercent: 100,
  position: 'center',
};

export const DEFAULT_TIME_BELOW_STYLE: DisplayTextStyle = {
  fontFamily: 'system',
  color: '#f2f2f2',
  sizePercent: 100,
  position: 'bottom-center',
};

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  mode: 'timer',
  showBlockName: true,
  showTimeBelow: false,
  timerStyle: { ...DEFAULT_TIMER_STYLE },
  timeBelowStyle: { ...DEFAULT_TIME_BELOW_STYLE },
};

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
