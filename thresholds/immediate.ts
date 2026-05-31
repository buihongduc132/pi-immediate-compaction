import { normalizeThresholdArgs, type ThresholdLogic } from "./types";
import type { CoordinatorState, ImmediateCompactionConfig, TriggerEvaluationContext, UsageSnapshot } from "../types";

export function createImmediateThreshold(): ThresholdLogic {
	return {
		id: "immediate",
		evaluate(snapshot: UsageSnapshot, contextOrConfig: TriggerEvaluationContext | ImmediateCompactionConfig, maybeState?: CoordinatorState) {
			const context = normalizeThresholdArgs(contextOrConfig, maybeState);
			if (!context.config.immediate.enabled) return null;
			if (!snapshot.valid || snapshot.percent === null) return null;
			const target =
				context.autoCompactPercent +
				context.config.immediate.offsetPercentFromAuto;
			const previous = context.state.lastPercent;
			const crossed =
				previous === null
					? snapshot.percent >= target
					: previous <= target && snapshot.percent > target;
			if (!crossed) return null;
			return {
				kind: "immediate",
				reason: "crossed-immediate-threshold",
				percent: snapshot.percent,
				thresholdPercent: target,
				customInstructions: context.config.immediate.customInstructions,
				postCompactPrompt: context.config.immediate.postCompactPrompt,
				deliverAs: context.config.immediate.deliverAs,
				triggerTurn: context.config.immediate.triggerTurn,
			};
		},
	};
}

export function evaluateImmediateThreshold(snapshot: any, config: any, state: any) {
	return createImmediateThreshold().evaluate(snapshot, config, state);
}

export const immediateThreshold = createImmediateThreshold();
