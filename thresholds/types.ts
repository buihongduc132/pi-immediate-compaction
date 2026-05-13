import type {
	CoordinatorState,
	ImmediateCompactionConfig,
	ThresholdDecision,
	TriggerEvaluationContext,
	UsageSnapshot,
} from "../types";

export interface ThresholdLogic {
	id: string;
	evaluate(
		snapshot: UsageSnapshot,
		contextOrConfig: TriggerEvaluationContext | ImmediateCompactionConfig,
		maybeState?: CoordinatorState,
	): ThresholdDecision | null;
}

export function normalizeThresholdArgs(
	contextOrConfig: TriggerEvaluationContext | ImmediateCompactionConfig,
	maybeState?: CoordinatorState,
): TriggerEvaluationContext {
	if ("config" in contextOrConfig) {
		return contextOrConfig;
	}
	return {
		autoCompactPercent:
			contextOrConfig.autoCompactPercent ?? 91.37684210526316,
		config: contextOrConfig,
		state:
			maybeState ??
			({
				phase: "idle",
				lastPercent: null,
				lastTriggeredKind: null,
				lastTriggeredPercent: null,
				lastTriggeredAt: null,
				compactionEpoch: 0,
				awaitingFreshUsage: false,
				cooldownUntil: 0,
				lastPromptEpoch: 0,
				inFlight: false,
				armedDecision: null,
			} as CoordinatorState),
	};
}
