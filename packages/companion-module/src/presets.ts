import { combineRgb } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { formatDuration } from './cueclockState.js'

// Mirrors the Control panel's own add/remove time steps (NowPlaying.tsx ADJUST_STEPS).
const TIME_STEP_SECONDS = [10, 60, 300, 600, 3600] as const

const ADD_COLOR = combineRgb(0, 90, 0)
const SUBTRACT_COLOR = combineRgb(120, 0, 0)
const PRESET_COLOR = combineRgb(0, 30, 90)
const TEXT_COLOR = combineRgb(255, 255, 255)

export function UpdatePresetDefinitions(self: ModuleInstance): void {
	const presets: Parameters<ModuleInstance['setPresetDefinitions']>[1] = {}
	const timeAdjustIds: string[] = []

	for (const seconds of TIME_STEP_SECONDS) {
		const addId = `add_time_${seconds}`
		presets[addId] = {
			type: 'simple',
			name: `Add ${formatDuration(seconds)}`,
			style: { text: `+${formatDuration(seconds)}`, size: '18', color: TEXT_COLOR, bgcolor: ADD_COLOR },
			steps: [{ down: [{ actionId: 'add_time', options: { seconds } }], up: [] }],
			feedbacks: [],
		}
		timeAdjustIds.push(addId)

		const subtractId = `subtract_time_${seconds}`
		presets[subtractId] = {
			type: 'simple',
			name: `Subtract ${formatDuration(seconds)}`,
			style: { text: `-${formatDuration(seconds)}`, size: '18', color: TEXT_COLOR, bgcolor: SUBTRACT_COLOR },
			steps: [{ down: [{ actionId: 'add_time', options: { seconds: -seconds } }], up: [] }],
			feedbacks: [],
		}
		timeAdjustIds.push(subtractId)
	}

	const cueclockPresets = self.getState()?.presets ?? []
	const presetButtonIds: string[] = []
	for (const preset of cueclockPresets) {
		const id = `start_preset_${preset.id}`
		presets[id] = {
			type: 'simple',
			name: `Start preset: ${preset.name}`,
			style: {
				text: `${preset.name}\n${formatDuration(preset.durationSeconds)}`,
				size: '14',
				color: TEXT_COLOR,
				bgcolor: PRESET_COLOR,
			},
			steps: [{ down: [{ actionId: 'start_preset', options: { id: preset.id } }], up: [] }],
			feedbacks: [],
		}
		presetButtonIds.push(id)
	}

	self.setPresetDefinitions(
		[
			{ id: 'time_adjust', name: 'Add / Remove Time', definitions: timeAdjustIds },
			{ id: 'cueclock_presets', name: 'CueClock Presets', definitions: presetButtonIds },
		],
		presets,
	)
}
