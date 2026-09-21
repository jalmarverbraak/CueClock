import { combineRgb } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { formatDuration } from './cueclockState.js'
import { DISPLAY_MODE_STYLE, RUN_STYLE } from './feedbacks.js'

type PresetDefinitions = Parameters<ModuleInstance['setPresetDefinitions']>[1]

// Mirrors the Control panel's own add/remove time steps (NowPlaying.tsx ADJUST_STEPS).
const TIME_STEP_SECONDS = [10, 60, 300, 600, 3600] as const
// Mirrors the Control panel's own speed adjustment steps (NowPlaying.tsx SPEED_STEPS).
const SPEED_STEP_PERCENT = [1, 5, 10] as const

const ADD_COLOR = combineRgb(0, 90, 0)
const SUBTRACT_COLOR = combineRgb(120, 0, 0)
const PRESET_COLOR = combineRgb(0, 30, 90)
const NEUTRAL_COLOR = combineRgb(30, 30, 30)
const DANGER_COLOR = combineRgb(140, 20, 20)
const TEXT_COLOR = combineRgb(255, 255, 255)

function addTransportPresets(presets: PresetDefinitions): string[] {
	presets.pause = {
		type: 'simple',
		name: 'Pause',
		style: { text: 'Pause', size: '18', color: TEXT_COLOR, bgcolor: NEUTRAL_COLOR },
		steps: [{ down: [{ actionId: 'pause', options: {} }], up: [] }],
		feedbacks: [{ feedbackId: 'run_state', options: { state: 'running' }, style: RUN_STYLE.running }],
	}
	presets.resume = {
		type: 'simple',
		name: 'Resume',
		style: { text: 'Resume', size: '18', color: TEXT_COLOR, bgcolor: NEUTRAL_COLOR },
		steps: [{ down: [{ actionId: 'resume', options: {} }], up: [] }],
		feedbacks: [{ feedbackId: 'run_state', options: { state: 'paused' }, style: RUN_STYLE.paused }],
	}
	presets.reset = {
		type: 'simple',
		name: 'Reset',
		style: { text: 'Reset', size: '18', color: TEXT_COLOR, bgcolor: DANGER_COLOR },
		steps: [{ down: [{ actionId: 'reset', options: {} }], up: [] }],
		feedbacks: [],
	}
	presets.next_block = {
		type: 'simple',
		name: 'Next Block',
		style: { text: 'Next Block ▶', size: '14', color: TEXT_COLOR, bgcolor: NEUTRAL_COLOR },
		steps: [{ down: [{ actionId: 'next_block', options: {} }], up: [] }],
		feedbacks: [],
	}
	return ['pause', 'resume', 'reset', 'next_block']
}

function addTimeAdjustPresets(presets: PresetDefinitions): string[] {
	const ids: string[] = []
	for (const seconds of TIME_STEP_SECONDS) {
		const addId = `add_time_${seconds}`
		presets[addId] = {
			type: 'simple',
			name: `Add ${formatDuration(seconds)}`,
			style: { text: `+${formatDuration(seconds)}`, size: '18', color: TEXT_COLOR, bgcolor: ADD_COLOR },
			steps: [{ down: [{ actionId: 'add_time', options: { seconds } }], up: [] }],
			feedbacks: [],
		}
		ids.push(addId)

		const subtractId = `subtract_time_${seconds}`
		presets[subtractId] = {
			type: 'simple',
			name: `Subtract ${formatDuration(seconds)}`,
			style: { text: `-${formatDuration(seconds)}`, size: '18', color: TEXT_COLOR, bgcolor: SUBTRACT_COLOR },
			steps: [{ down: [{ actionId: 'add_time', options: { seconds: -seconds } }], up: [] }],
			feedbacks: [],
		}
		ids.push(subtractId)
	}
	return ids
}

function addSpeedPresets(presets: PresetDefinitions): string[] {
	const ids: string[] = []
	for (const delta of SPEED_STEP_PERCENT) {
		const upId = `speed_up_${delta}`
		presets[upId] = {
			type: 'simple',
			name: `Speed +${delta}%`,
			style: { text: `Speed\n+${delta}%`, size: '14', color: TEXT_COLOR, bgcolor: ADD_COLOR },
			steps: [{ down: [{ actionId: 'adjust_speed', options: { delta } }], up: [] }],
			feedbacks: [],
		}
		ids.push(upId)

		const downId = `speed_down_${delta}`
		presets[downId] = {
			type: 'simple',
			name: `Speed -${delta}%`,
			style: { text: `Speed\n-${delta}%`, size: '14', color: TEXT_COLOR, bgcolor: SUBTRACT_COLOR },
			steps: [{ down: [{ actionId: 'adjust_speed', options: { delta: -delta } }], up: [] }],
			feedbacks: [],
		}
		ids.push(downId)
	}

	presets.reset_speed = {
		type: 'simple',
		name: 'Reset Speed to 100%',
		style: { text: 'Speed\n$(self:speed_percent)%', size: '14', color: TEXT_COLOR, bgcolor: NEUTRAL_COLOR },
		steps: [{ down: [{ actionId: 'set_speed', options: { percent: 100 } }], up: [] }],
		feedbacks: [],
	}
	ids.push('reset_speed')
	return ids
}

function addDisplayAndMessagePresets(presets: PresetDefinitions): string[] {
	presets.toggle_display_mode = {
		type: 'simple',
		name: 'Toggle Clock / Timer Display',
		style: { text: 'Display:\n$(self:display_mode)', size: '14', color: TEXT_COLOR, bgcolor: NEUTRAL_COLOR },
		steps: [{ down: [{ actionId: 'toggle_display_mode', options: {} }], up: [] }],
		feedbacks: [{ feedbackId: 'display_mode', options: { mode: 'clock' }, style: DISPLAY_MODE_STYLE }],
	}
	presets.clear_message = {
		type: 'simple',
		name: 'Clear Message',
		style: { text: 'Clear\nMessage', size: '14', color: TEXT_COLOR, bgcolor: NEUTRAL_COLOR },
		steps: [{ down: [{ actionId: 'clear_message', options: {} }], up: [] }],
		feedbacks: [],
	}
	return ['toggle_display_mode', 'clear_message']
}

function addCueClockPresetButtons(self: ModuleInstance, presets: PresetDefinitions): string[] {
	const ids: string[] = []
	for (const preset of self.getState()?.presets ?? []) {
		const id = `arm_preset_${preset.id}`
		presets[id] = {
			type: 'simple',
			name: `Arm preset: ${preset.name}`,
			style: {
				text: `${preset.name}\n${formatDuration(preset.durationSeconds)}`,
				size: '14',
				color: TEXT_COLOR,
				bgcolor: PRESET_COLOR,
			},
			// Arms (sets the duration, paused) rather than starting immediately,
			// matching how presets behave in the Control panel - the operator
			// decides exactly when to hit Start/Resume.
			steps: [{ down: [{ actionId: 'arm_preset', options: { id: preset.id } }], up: [] }],
			feedbacks: [],
		}
		ids.push(id)
	}
	return ids
}

export function UpdatePresetDefinitions(self: ModuleInstance): void {
	const presets: PresetDefinitions = {}

	const transportIds = addTransportPresets(presets)
	const timeAdjustIds = addTimeAdjustPresets(presets)
	const speedIds = addSpeedPresets(presets)
	const displayAndMessageIds = addDisplayAndMessagePresets(presets)
	const cueclockPresetIds = addCueClockPresetButtons(self, presets)

	self.setPresetDefinitions(
		[
			{ id: 'transport', name: 'Transport', definitions: transportIds },
			{ id: 'time_adjust', name: 'Add / Remove Time', definitions: timeAdjustIds },
			{ id: 'speed', name: 'Speed', definitions: speedIds },
			{ id: 'display_message', name: 'Display & Message', definitions: displayAndMessageIds },
			{ id: 'cueclock_presets', name: 'CueClock Presets', definitions: cueclockPresetIds },
		],
		presets,
	)
}
