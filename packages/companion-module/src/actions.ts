import type ModuleInstance from './main.js'
import { clampSpeedPercent, formatDuration, MAX_SPEED_PERCENT, MIN_SPEED_PERCENT } from './cueclockState.js'

export type ActionsSchema = {
	pause: { options: Record<string, never> }
	resume: { options: Record<string, never> }
	reset: { options: Record<string, never> }
	next_block: { options: Record<string, never> }
	add_time: { options: { seconds: number } }
	set_speed: { options: { percent: number } }
	adjust_speed: { options: { delta: number } }
	start_quick: { options: { hours: number; minutes: number; seconds: number } }
	arm_quick: { options: { hours: number; minutes: number; seconds: number } }
	arm_preset: { options: { id: string } }
	toggle_display_mode: { options: Record<string, never> }
	send_message: { options: { text: string } }
	clear_message: { options: Record<string, never> }
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		pause: {
			name: 'Pause',
			options: [],
			callback: async () => self.callAction('/api/actions/pause'),
		},
		resume: {
			name: 'Resume',
			options: [],
			callback: async () => self.callAction('/api/actions/resume'),
		},
		reset: {
			name: 'Reset',
			options: [],
			callback: async () => self.callAction('/api/actions/reset'),
		},
		next_block: {
			name: 'Next Block',
			options: [],
			callback: async () => self.callAction('/api/actions/next-block'),
		},
		add_time: {
			name: 'Add / Remove Time',
			options: [
				{
					id: 'seconds',
					type: 'number',
					label: 'Seconds (negative to subtract)',
					default: 60,
					min: -3600,
					max: 3600,
				},
			],
			callback: async (event) => self.callAction('/api/actions/add-time', { seconds: event.options.seconds }),
		},
		set_speed: {
			name: 'Set Speed (%)',
			options: [
				{
					id: 'percent',
					type: 'number',
					label: 'Speed percent (100 = real time)',
					default: 100,
					min: MIN_SPEED_PERCENT,
					max: MAX_SPEED_PERCENT,
				},
			],
			callback: async (event) => self.callAction('/api/actions/set-speed', { percent: event.options.percent }),
		},
		adjust_speed: {
			name: 'Adjust Speed (±%)',
			options: [
				{
					id: 'delta',
					type: 'number',
					label: 'Change in percent (negative to slow down)',
					default: 5,
					min: -(MAX_SPEED_PERCENT - MIN_SPEED_PERCENT),
					max: MAX_SPEED_PERCENT - MIN_SPEED_PERCENT,
				},
			],
			callback: async (event) => {
				const current = self.getState()?.speedPercent ?? 100
				const next = clampSpeedPercent(current + Number(event.options.delta))
				return self.callAction('/api/actions/set-speed', { percent: next })
			},
		},
		start_quick: {
			name: 'Start Quick Timer',
			options: [
				{ id: 'hours', type: 'number', label: 'Hours', default: 0, min: 0, max: 24 },
				{ id: 'minutes', type: 'number', label: 'Minutes', default: 5, min: 0, max: 59 },
				{ id: 'seconds', type: 'number', label: 'Seconds', default: 0, min: 0, max: 59 },
			],
			callback: async (event) => {
				const totalSeconds =
					Number(event.options.hours) * 3600 + Number(event.options.minutes) * 60 + Number(event.options.seconds)
				return self.callAction('/api/actions/start-quick', { seconds: totalSeconds })
			},
		},
		arm_quick: {
			name: 'Arm Quick Timer (set duration, do not start)',
			options: [
				{ id: 'hours', type: 'number', label: 'Hours', default: 0, min: 0, max: 24 },
				{ id: 'minutes', type: 'number', label: 'Minutes', default: 5, min: 0, max: 59 },
				{ id: 'seconds', type: 'number', label: 'Seconds', default: 0, min: 0, max: 59 },
			],
			callback: async (event) => {
				const totalSeconds =
					Number(event.options.hours) * 3600 + Number(event.options.minutes) * 60 + Number(event.options.seconds)
				return self.callAction('/api/actions/arm-quick', { seconds: totalSeconds })
			},
		},
		arm_preset: {
			name: 'Arm Preset (set duration, do not start)',
			options: [
				{
					id: 'id',
					type: 'dropdown',
					label: 'Preset',
					default: self.getState()?.presets[0]?.id ?? '',
					choices: (self.getState()?.presets ?? []).map((p) => ({
						id: p.id,
						label: `${p.name} (${formatDuration(p.durationSeconds)})`,
					})),
				},
			],
			callback: async (event) => {
				const preset = self.getState()?.presets.find((p) => p.id === event.options.id)
				if (!preset) {
					self.log('warn', `Arm Preset: unknown or not-yet-loaded preset id "${event.options.id}"`)
					return
				}
				return self.callAction('/api/actions/arm-quick', { seconds: preset.durationSeconds })
			},
		},
		toggle_display_mode: {
			name: 'Toggle Clock / Timer Display',
			options: [],
			callback: async () => self.callAction('/api/actions/toggle-display-mode'),
		},
		send_message: {
			name: 'Send Message to Display',
			options: [
				{
					id: 'text',
					type: 'textinput',
					label: 'Message text',
					default: '',
					useVariables: true,
				},
			],
			callback: async (event) => self.callAction('/api/actions/set-message', { text: event.options.text }),
		},
		clear_message: {
			name: 'Clear Message',
			options: [],
			callback: async () => self.callAction('/api/actions/set-message', { text: '' }),
		},
	})
}
