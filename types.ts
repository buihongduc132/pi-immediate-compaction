export type TriggerKind = "immediate" | "overflow";
export type TriggerMode = "idle-only" | "arm-during-streaming";
export type DeliveryMode = "followUp" | "steer";
export type CoordinatorPhase =
	| "idle"
	| "armed_immediate"
	| "armed_overflow"
	| "compacting"
	| "cooldown"
	| "awaiting_fresh_usage"
	| "error";

export interface ContextUsageLike {
	tokens: number | null;
	percent: number | null;
	contextWindow: number | null;
}

export interface UsageSnapshot {
	sessionId: string;
	compactionEpoch: number;
	sampleEpoch: number;
	valid: boolean;
	source: "assistant-usage" | "estimated-trailing" | "unknown";
	contextWindow: number | null;
	tokens: number | null;
	percent: number | null;
	lastAssistantTimestamp: number | null;
	lastRealActivityTimestamp: number | null;
	historyReads: number;
}

export interface ThresholdDecision {
	kind: TriggerKind;
	reason: string;
	percent: number;
	thresholdPercent: number;
	customInstructions?: string;
	postCompactPrompt?: string;
	deliverAs?: DeliveryMode;
	triggerTurn?: boolean;
}

export interface CoordinatorState {
	phase: CoordinatorPhase;
	lastPercent: number | null;
	lastTriggeredKind: TriggerKind | null;
	lastTriggeredPercent: number | null;
	lastTriggeredAt: number | null;
	compactionEpoch: number;
	awaitingFreshUsage: boolean;
	cooldownUntil: number;
	lastPromptEpoch: number;
	inFlight: boolean;
	armedDecision: ThresholdDecision | null;
}

export interface TriggerConfig {
	enabled: boolean;
	customInstructions?: string;
	postCompactPrompt?: string;
	deliverAs?: DeliveryMode;
	triggerTurn?: boolean;
}

export interface ImmediateTriggerConfig extends TriggerConfig {
	offsetPercentFromAuto: number;
}

export interface OverflowTriggerConfig extends TriggerConfig {
	percent: number;
}

export interface CooldownConfig {
	minMsBetweenCompactions: number;
	requirePercentIncreaseBeforeRetrigger: number;
}

export interface EngineConfig {
	kind: "auto" | "core" | "command";
	command: string | null;
}

export interface ImmediateCompactionConfig {
	enabled: boolean;
	triggerMode: TriggerMode;
	cooldown: CooldownConfig;
	immediate: ImmediateTriggerConfig;
	overflow: OverflowTriggerConfig;
	engine: EngineConfig;
	autoCompactPercent?: number;
}

export interface TriggerEvaluationContext {
	autoCompactPercent: number;
	config: ImmediateCompactionConfig;
	state: CoordinatorState;
}

export interface DeliveryRuntime {
	isStreaming: boolean;
	sendUserMessage: (content: string, options?: { deliverAs?: DeliveryMode }) => void;
	sendMessage: (
		message: { customType: string; content: string; display: boolean },
		options: { triggerTurn?: boolean; deliverAs?: DeliveryMode },
	) => void;
}

export interface PostCompactPrompt {
	kind: TriggerKind;
	message: string;
	deliverAs?: DeliveryMode;
	triggerTurn: boolean;
}

export interface PersistedState {
	compactionEpoch: number;
	lastTriggeredKind: TriggerKind | null;
	lastTriggeredPercent: number | null;
	lastTriggeredAt: number | null;
	awaitingFreshUsage: boolean;
	lastPromptEpoch: number;
	cooldownUntil: number;
}
