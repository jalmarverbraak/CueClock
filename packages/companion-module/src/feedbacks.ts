import { combineRgb } from '@companion-module/base'
import type ModuleInstance from './main.js'
import type { ColorState } from './cueclockState.js'

export type FeedbacksSchema = {
	color_state: { type: 'boolean'; options: { state: ColorState } }
}

const STYLE: Record<ColorState, { bgcolor: number; color: number }> = {
	normal: { bgcolor: combineRgb(0, 0, 0), color: combineRgb(255, 255, 255) },
	warning: { bgcolor: combineRgb(180, 130, 0), color: combineRgb(0, 0, 0) },
	critical: { bgcolor: combineRgb(200, 30, 30), color: combineRgb(255, 255, 255) },
	overtime: { bgcolor: combineRgb(120, 0, 0), color: combineRgb(255, 255, 255) },
}

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		color_state: {
			name: 'Timer Color State',
			description: "True when the display's current state matches the selected color - style this button to match for a traffic-light indicator.",
			type: 'boolean',
			defaultStyle: STYLE.critical,
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
	})
}
