import type ModuleInstance from './main.js'

export type ActionsSchema = {
	pause: { options: Record<string, never> }
	resume: { options: Record<string, never> }
	reset: { options: Record<string, never> }
	next_block: { options: Record<string, never> }
	add_time: { options: { seconds: number } }
	set_speed: { options: { percent: number } }
	start_quick: { options: { seconds: number } }
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
					min: 25,
					max: 400,
				},
			],
			callback: async (event) => self.callAction('/api/actions/set-speed', { percent: event.options.percent }),
		},
		start_quick: {
			name: 'Start Quick Timer',
			options: [
				{
					id: 'seconds',
					type: 'number',
					label: 'Duration in seconds',
					default: 300,
					min: 1,
					max: 86400,
				},
			],
			callback: async (event) => self.callAction('/api/actions/start-quick', { seconds: event.options.seconds }),
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
