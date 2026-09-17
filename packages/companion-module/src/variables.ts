import type ModuleInstance from './main.js'
import {
	activeBlockName,
	computeFinishTime,
	formatClockTime,
	formatDuration,
	formatOffset,
	speedMinuteRealSeconds,
} from './cueclockState.js'

export type VariablesSchema = {
	remaining_time: string
	remaining_seconds: number
	color_state: string
	active_block_name: string
	schedule_offset: string
	speed_percent: number
	speed_minute_duration: string
	finish_time: string
	message: string
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({
		remaining_time: { name: 'Remaining time (mm:ss)' },
		remaining_seconds: { name: 'Remaining time (raw seconds)' },
		color_state: { name: 'Color state (normal/warning/critical/overtime)' },
		active_block_name: { name: 'Active schedule block name' },
		schedule_offset: { name: 'Ahead/behind schedule' },
		speed_percent: { name: 'Current speed percent' },
		speed_minute_duration: { name: 'Real time for one countdown minute at current speed (mm:ss)' },
		finish_time: { name: 'Clock time the timer will reach zero (HH:MM:SS)' },
		message: { name: 'Message shown on display' },
	})
}

export function PushVariableValues(self: ModuleInstance): void {
	const state = self.getState()
	if (!state) return
	self.setVariableValues({
		remaining_time: formatDuration(state.remainingSeconds),
		remaining_seconds: Math.round(state.remainingSeconds),
		color_state: state.colorState,
		active_block_name: activeBlockName(state),
		schedule_offset: formatOffset(state.scheduleOffsetSeconds),
		speed_percent: state.speedPercent,
		speed_minute_duration: formatDuration(speedMinuteRealSeconds(state.speedPercent)),
		finish_time: formatClockTime(computeFinishTime(state)),
		message: state.message ?? '',
	})
}
