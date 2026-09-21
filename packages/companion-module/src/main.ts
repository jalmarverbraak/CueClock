import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, PushVariableValues, type VariablesSchema } from './variables.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresetDefinitions } from './presets.js'
import type { CueClockState } from './cueclockState.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

const RECONNECT_DELAY_MS = 3000

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	private ws: WebSocket | null = null
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null
	private destroyed = false
	private state: CueClockState | null = null
	private lastPresetsKey: string | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.destroyed = false

		this.updateActions()
		this.updateFeedbacks()
		this.updateVariableDefinitions()
		this.updatePresetDefinitions()

		this.connect()
	}

	async destroy(): Promise<void> {
		this.destroyed = true
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
		this.ws?.close()
		this.ws = null
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.ws?.close()
		this.connect()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	getState(): CueClockState | null {
		return this.state
	}

	private get baseUrl(): string {
		return `http://${this.config.host}:${this.config.port}`
	}

	async callAction(path: string, params: Record<string, string | number> = {}): Promise<void> {
		const url = new URL(path, this.baseUrl)
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, String(value))
		}
		try {
			const res = await fetch(url)
			if (!res.ok) {
				const body = await res.json().catch(() => ({}))
				this.log('warn', `CueClock rejected ${path}: ${(body as { error?: string }).error ?? res.statusText}`)
			}
		} catch (err) {
			this.log('error', `Failed to reach CueClock at ${this.baseUrl}: ${(err as Error).message}`)
			this.updateStatus(InstanceStatus.ConnectionFailure)
		}
	}

	private connect(): void {
		if (this.destroyed) return
		this.updateStatus(InstanceStatus.Connecting)

		const ws = new WebSocket(`ws://${this.config.host}:${this.config.port}/ws`)
		this.ws = ws

		ws.addEventListener('open', () => {
			this.updateStatus(InstanceStatus.Ok)
		})

		ws.addEventListener('message', (event) => {
			try {
				const data = JSON.parse(String(event.data)) as { type?: string; state?: CueClockState }
				if (data.type === 'state' && data.state) {
					this.state = data.state
					this.updateVariables()
					this.checkFeedbacks('color_state', 'run_state', 'display_mode')

					const presetsKey = JSON.stringify(data.state.presets)
					if (presetsKey !== this.lastPresetsKey) {
						this.lastPresetsKey = presetsKey
						// The "Start Preset" action's dropdown and the ready-made preset
						// buttons are both generated from CueClock's saved presets, so
						// both need refreshing whenever that list changes.
						this.updateActions()
						this.updatePresetDefinitions()
					}
				}
			} catch {
				// ignore malformed frames
			}
		})

		ws.addEventListener('close', () => this.scheduleReconnect())
		ws.addEventListener('error', () => {
			// The socket already transitions to closed on its own after an error;
			// calling ws.close() here recurses into Node's WebSocket error dispatch
			// and blows the call stack.
			this.log('error', `WebSocket error connecting to ${this.baseUrl}`)
		})
	}

	private scheduleReconnect(): void {
		if (this.destroyed) return
		this.updateStatus(InstanceStatus.Disconnected)
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
		this.reconnectTimer = setTimeout(() => this.connect(), RECONNECT_DELAY_MS)
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	updatePresetDefinitions(): void {
		UpdatePresetDefinitions(this)
	}

	updateVariables(): void {
		PushVariableValues(this)
	}
}
