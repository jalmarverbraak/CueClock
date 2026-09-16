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
  durationSeconds: number;
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
}

export interface Preset {
  id: string;
  name: string;
  durationSeconds: number;
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
