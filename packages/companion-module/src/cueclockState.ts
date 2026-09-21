// Minimal shape of CueClock's EngineState we care about here - kept as a local
// duck-typed definition (rather than importing @cueclock/shared) so this module
// stays a plain, independently distributable npm package for Companion.

export type ColorState = 'normal' | 'warning' | 'critical' | 'overtime'

export interface BlockProjection {
	blockId: string
	name: string
	status: 'done' | 'active' | 'upcoming'
}

export type DisplayMode = 'timer' | 'clock'

export const MIN_SPEED_PERCENT = 25
export const MAX_SPEED_PERCENT = 400

export function clampSpeedPercent(percent: number): number {
	return Math.min(MAX_SPEED_PERCENT, Math.max(MIN_SPEED_PERCENT, percent))
}

export interface PresetInfo {
	id: string
	name: string
	durationSeconds: number
}

export interface CueClockState {
	mode: 'idle' | 'quick' | 'block' | 'countup'
	running: boolean
	speedPercent: number
	remainingSeconds: number
	colorState: ColorState
	message: string | null
	scheduleOffsetSeconds: number | null
	blockProjections: BlockProjection[]
	presets: PresetInfo[]
	displaySettings: { mode: DisplayMode }
}

export function formatDuration(totalSeconds: number): string {
	const sign = totalSeconds < 0 ? '-' : ''
	const abs = Math.ceil(Math.abs(totalSeconds))
	const h = Math.floor(abs / 3600)
	const m = Math.floor((abs % 3600) / 60)
	const s = abs % 60
	const pad = (n: number) => n.toString().padStart(2, '0')
	return h > 0 ? `${sign}${h}:${pad(m)}:${pad(s)}` : `${sign}${pad(m)}:${pad(s)}`
}

export function formatOffset(seconds: number | null): string {
	if (seconds === null) return 'No schedule running'
	if (Math.abs(seconds) < 1) return 'On schedule'
	return `${seconds > 0 ? 'Behind' : 'Ahead'} ${formatDuration(Math.abs(seconds))}`
}

export function activeBlockName(state: CueClockState): string {
	return state.blockProjections.find((b) => b.status === 'active')?.name ?? ''
}

export function formatClockTime(date: Date | null): string {
	if (!date) return '--:--:--'
	const pad = (n: number) => n.toString().padStart(2, '0')
	return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

// Wall-clock time the countdown will reach zero, based on the remaining
// seconds already reported by the server (which account for speed).
export function computeFinishTime(state: CueClockState): Date | null {
	if (!state.running) return null
	return new Date(Date.now() + state.remainingSeconds * 1000)
}

// Real-world seconds it takes to burn through one countdown-minute at the
// given speed (100% = 60s of real time per countdown-minute).
export function speedMinuteRealSeconds(speedPercent: number): number {
	if (speedPercent <= 0) return 0
	return (60 * 100) / speedPercent
}

export type RunState = 'idle' | 'running' | 'paused' | 'overtime'

export function computeRunState(state: CueClockState): RunState {
	if (state.mode === 'idle') return 'idle'
	if (state.remainingSeconds < 0) return 'overtime'
	return state.running ? 'running' : 'paused'
}

export interface TimeParts {
	hours: number
	minutes: number
	seconds: number
}

export function splitDuration(totalSeconds: number): TimeParts {
	const abs = Math.ceil(Math.abs(totalSeconds))
	return {
		hours: Math.floor(abs / 3600),
		minutes: Math.floor((abs % 3600) / 60),
		seconds: abs % 60,
	}
}

export function pad2(n: number): string {
	return n.toString().padStart(2, '0')
}
