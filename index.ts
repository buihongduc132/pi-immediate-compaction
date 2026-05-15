export type { CompactionSource } from "./types";

export {
	DEFAULT_CONFIG,
	computeAutoCompactPercent,
	computeImmediatePercent,
	deriveAutoCompactPercent,
	calculateAutoCompactPercent,
	loadConfig,
} from "./config";
export {
	CompactionCoordinator,
	createCoordinator,
	markCompactionFinished,
	maybeTriggerCompaction,
} from "./coordinator";
export {
	deliverPostCompactPrompt,
	deliverPostCompactionPrompt,
} from "./delivery-policy";
export {
	createEmptyUsageSnapshot,
	createUsageCache,
	createUsageSnapshot,
	getUsageSnapshot,
	invalidateUsageAfterCompaction,
	recordUsageSample,
	resetUsageCache,
	clearUsageSnapshots,
	updateUsageSnapshot,
} from "./usage-cache";
export { createCoordinatorState, getState, restorePersistedState } from "./state";
export {
	createImmediateThreshold,
	evaluateImmediateThreshold,
} from "./thresholds/immediate";
export {
	createOverflowThreshold,
	evaluateOverflowThreshold,
} from "./thresholds/overflow";
export { createThresholdRegistry } from "./thresholds/registry";
export { resolveCompactionEngine } from "./engine/resolver";
