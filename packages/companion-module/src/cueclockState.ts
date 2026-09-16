// Minimal shape of CueClock's EngineState we care about here - kept as a local
// duck-typed definition (rather than importing @cueclock/shared) so this module
// stays a plain, independently distributable npm package for Companion.

export type ColorState = 'normal' | 'warning' | 'critical' | 'overtime'

export interface BlockProjection {
	blockId: string
	name: string
	status: 'done' | 'active' | 'upcoming'
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
