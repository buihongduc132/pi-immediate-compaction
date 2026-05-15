import type { CoordinatorState, PersistedState } from "./types";

export const STATE_ENTRY_TYPE = "immediate-compaction-state";

const stateBySession = new Map<string, CoordinatorState>();

export function createCoordinatorState(): CoordinatorState {
	return {
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
		lastTriggerSource: "unknown",
	};
}

export function getState(sessionId: string): CoordinatorState {
	const existing = stateBySession.get(sessionId);
	if (existing) return existing;
	const created = createCoordinatorState();
	stateBySession.set(sessionId, created);
	return created;
}

export function restorePersistedState(
	sessionId: string,
	entries: Array<any>,
): CoordinatorState {
	const state = getState(sessionId);
	const match = [...entries]
		.reverse()
		.find(
			(entry) =>
				entry?.type === "custom" &&
				entry?.customType === STATE_ENTRY_TYPE &&
				entry?.data,
		);
		if (!match?.data) return state;
	const data = match.data as Partial<PersistedState>;
	state.compactionEpoch = data.compactionEpoch ?? state.compactionEpoch;
	state.lastTriggeredKind = data.lastTriggeredKind ?? state.lastTriggeredKind;
	state.lastTriggeredPercent =
		data.lastTriggeredPercent ?? state.lastTriggeredPercent;
	state.lastTriggeredAt = data.lastTriggeredAt ?? state.lastTriggeredAt;
	state.awaitingFreshUsage =
		data.awaitingFreshUsage ?? state.awaitingFreshUsage;
	state.lastPromptEpoch = data.lastPromptEpoch ?? state.lastPromptEpoch;
	state.cooldownUntil = data.cooldownUntil ?? state.cooldownUntil;
	state.phase = state.awaitingFreshUsage ? "awaiting_fresh_usage" : state.phase;
	return state;
}
