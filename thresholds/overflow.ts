import { normalizeThresholdArgs, type ThresholdLogic } from "./types";
import type { CoordinatorState, ImmediateCompactionConfig, TriggerEvaluationContext, UsageSnapshot } from "../types";

export function createOverflowThreshold(): ThresholdLogic {
	return {
		id: "overflow",
		evaluate(snapshot: UsageSnapshot, contextOrConfig: TriggerEvaluationContext | ImmediateCompactionConfig, maybeState?: CoordinatorState) {
			const context = normalizeThresholdArgs(contextOrConfig, maybeState);
			if (!context.config.overflow.enabled) return null;
			if (!snapshot.valid || snapshot.percent === null) return null;
			const previous = context.state.lastPercent;
			const target = context.config.overflow.percent;
			const crossed =
				previous === null
					? snapshot.percent > target
					: previous <= target && snapshot.percent > target;
			if (!crossed) return null;
			return {
				kind: "overflow",
				reason: "crossed-overflow-threshold",
				percent: snapshot.percent,
				thresholdPercent: target,
				customInstructions: context.config.overflow.customInstructions,
				postCompactPrompt: context.config.overflow.postCompactPrompt,
				deliverAs: context.config.overflow.deliverAs,
				triggerTurn: context.config.overflow.triggerTurn,
			};
		},
	};
}

export function evaluateOverflowThreshold(snapshot: any, config: any, state: any) {
	return createOverflowThreshold().evaluate(snapshot, config, state);
}

export const overflowThreshold = createOverflowThreshold();
