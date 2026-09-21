import type ModuleInstance from './main.js'
import {
	activeBlockName,
	computeFinishTime,
	computeRunState,
	formatClockTime,
	formatDuration,
	formatOffset,
	pad2,
	speedMinuteRealSeconds,
	splitDuration,
} from './cueclockState.js'

export type VariablesSchema = {
	remaining_time: string
	remaining_seconds: number
	remaining_hh: string
	remaining_mm: string
	remaining_ss: string
	color_state: string
	run_state: string
	display_mode: string
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
		remaining_hh: { name: 'Remaining time - hours component (2-digit)' },
		remaining_mm: { name: 'Remaining time - minutes component (2-digit)' },
		remaining_ss: { name: 'Remaining time - seconds component (2-digit)' },
		color_state: { name: 'Color state (normal/warning/critical/overtime)' },
		run_state: { name: 'Run state (idle/running/paused/overtime)' },
		display_mode: { name: 'Display mode (timer/clock)' },
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
	const parts = splitDuration(state.remainingSeconds)
	self.setVariableValues({
		remaining_time: formatDuration(state.remainingSeconds),
		remaining_seconds: Math.round(state.remainingSeconds),
		remaining_hh: pad2(parts.hours),
		remaining_mm: pad2(parts.minutes),
		remaining_ss: pad2(parts.seconds),
		color_state: state.colorState,
		run_state: computeRunState(state),
		display_mode: state.displaySettings.mode,
		active_block_name: activeBlockName(state),
		schedule_offset: formatOffset(state.scheduleOffsetSeconds),
		speed_percent: state.speedPercent,
		speed_minute_duration: formatDuration(speedMinuteRealSeconds(state.speedPercent)),
		finish_time: formatClockTime(computeFinishTime(state)),
		message: state.message ?? '',
	})
}
