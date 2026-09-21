import { combineRgb } from '@companion-module/base'
import type ModuleInstance from './main.js'
import { computeRunState, type ColorState, type DisplayMode, type RunState } from './cueclockState.js'

export type FeedbacksSchema = {
	color_state: { type: 'boolean'; options: { state: ColorState } }
	run_state: { type: 'boolean'; options: { state: RunState } }
	display_mode: { type: 'boolean'; options: { mode: DisplayMode } }
}

const COLOR_STYLE: Record<ColorState, { bgcolor: number; color: number }> = {
	normal: { bgcolor: combineRgb(0, 0, 0), color: combineRgb(255, 255, 255) },
	warning: { bgcolor: combineRgb(180, 130, 0), color: combineRgb(0, 0, 0) },
	critical: { bgcolor: combineRgb(200, 30, 30), color: combineRgb(255, 255, 255) },
	overtime: { bgcolor: combineRgb(120, 0, 0), color: combineRgb(255, 255, 255) },
}

export const RUN_STYLE: Record<RunState, { bgcolor: number; color: number }> = {
	idle: { bgcolor: combineRgb(60, 60, 60), color: combineRgb(255, 255, 255) },
	running: { bgcolor: combineRgb(0, 130, 0), color: combineRgb(255, 255, 255) },
	paused: { bgcolor: combineRgb(180, 130, 0), color: combineRgb(0, 0, 0) },
	overtime: { bgcolor: combineRgb(120, 0, 0), color: combineRgb(255, 255, 255) },
}

export const DISPLAY_MODE_STYLE: { bgcolor: number; color: number } = {
	bgcolor: combineRgb(0, 60, 130),
	color: combineRgb(255, 255, 255),
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		color_state: {
			name: 'Timer Color State',
			description: "True when the display's current state matches the selected color - style this button to match for a traffic-light indicator.",
			type: 'boolean',
			defaultStyle: COLOR_STYLE.critical,
			options: [
				{
					id: 'state',
					type: 'dropdown',
					label: 'Color state',
					default: 'critical',
					choices: [
						{ id: 'normal', label: 'Normal' },
						{ id: 'warning', label: 'Warning' },
						{ id: 'critical', label: 'Critical' },
						{ id: 'overtime', label: 'Overtime' },
					],
				},
			],
			callback: (feedback) => self.getState()?.colorState === feedback.options.state,
		},
		run_state: {
			name: 'Run State',
			description: 'True when the timer is currently in the selected run state - use on Pause/Resume/Reset buttons so they reflect what CueClock is doing right now.',
			type: 'boolean',
			defaultStyle: RUN_STYLE.running,
			options: [
				{
					id: 'state',
					type: 'dropdown',
					label: 'Run state',
					default: 'running',
					choices: [
						{ id: 'idle', label: 'Idle' },
						{ id: 'running', label: 'Running' },
						{ id: 'paused', label: 'Paused' },
						{ id: 'overtime', label: 'Overtime' },
					],
				},
			],
			callback: (feedback) => {
				const state = self.getState()
				return state !== null && computeRunState(state) === feedback.options.state
			},
		},
		display_mode: {
			name: 'Display Mode',
			description: 'True when the display is currently showing the selected mode - use on the Toggle Clock/Timer button.',
			type: 'boolean',
			defaultStyle: DISPLAY_MODE_STYLE,
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Display mode',
					default: 'clock',
					choices: [
						{ id: 'timer', label: 'Timer' },
						{ id: 'clock', label: 'Clock' },
					],
				},
			],
			callback: (feedback) => self.getState()?.displaySettings.mode === feedback.options.mode,
		},
	})
}
