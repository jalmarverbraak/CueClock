export function formatDuration(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '-' : '';
  const abs = Math.ceil(Math.abs(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${sign}${h}:${pad(m)}:${pad(s)}` : `${sign}${pad(m)}:${pad(s)}`;
}

export function formatClock(epochMs: number | null): string {
  if (epochMs === null) return '--:--';
  const d = new Date(epochMs);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
