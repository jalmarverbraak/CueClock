export function formatDuration(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const abs = Math.ceil(Math.abs(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${sign}${h}:${pad(m)}:${pad(s)}` : `${sign}${pad(m)}:${pad(s)}`;
}

export function formatClock(epochMs: number | null, opts: { seconds?: boolean } = {}): string {
  if (epochMs === null) return '--:--';
  const d = new Date(epochMs);
  return d.toLocaleTimeString(
    [],
    opts.seconds
      ? { hour: '2-digit', minute: '2-digit', second: '2-digit' }
      : { hour: '2-digit', minute: '2-digit' },
  );
}

/** Accepts "mm:ss", "hh:mm:ss", or a bare number of minutes. Returns whole seconds, or null if unparsable. */
export function parseDurationInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map((p) => Number(p));
    if (parts.some((p) => Number.isNaN(p) || p < 0)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  }

  const minutes = Number(trimmed);
  if (Number.isNaN(minutes) || minutes < 0) return null;
  return Math.round(minutes * 60);
}

export function formatOffset(seconds: number | null): string {
  if (seconds === null) return '';
  if (Math.abs(seconds) < 1) return 'On schedule';
  const behind = seconds > 0;
  return `${behind ? 'Behind' : 'Ahead'} by ${formatDuration(Math.abs(seconds))}`;
}

export function formatDelay(seconds: number | null): string {
  if (seconds === null) return '';
  if (Math.abs(seconds) < 30) return 'On time';
  const late = seconds > 0;
  return `${late ? 'Delayed' : 'Early'} ${formatDuration(Math.abs(seconds))}`;
}

/** minutes-since-midnight -> "HH:MM" for an <input type="time"> value. */
export function minutesToTimeInput(minutes: number | null): string {
  if (minutes === null) return '';
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/** "HH:MM" from an <input type="time"> -> minutes-since-midnight, or null if empty/invalid. */
export function timeInputToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Resolves a "minutes since midnight" anchor to the nearest occurrence at/after `nowMs` (rolls to tomorrow if already passed today). */
export function resolveNextOccurrence(minutes: number, nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  if (d.getTime() <= nowMs) d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** The wall-clock moment the active timer will hit zero (or did, if already in overtime), given the live engine state fields. */
export function computeEndsAtMs(params: {
  mode: string;
  remainingSeconds: number;
  speedPercent: number;
  serverTimeMs: number;
}): number | null {
  if (params.mode === 'idle' || params.mode === 'countup') return null;
  return params.serverTimeMs + (params.remainingSeconds / (params.speedPercent / 100)) * 1000;
}
