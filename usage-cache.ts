import type { UsageSnapshot } from "./types";

export interface UsageCache {
	bySession: Map<string, UsageSnapshot>;
	historyScanCount: number;
}

const usageBySession = new Map<string, UsageSnapshot>();

export function createUsageSnapshot(
	partial: Partial<UsageSnapshot> & { sessionId: string },
): UsageSnapshot {
	return {
		sessionId: partial.sessionId,
		compactionEpoch: partial.compactionEpoch ?? 0,
		sampleEpoch: partial.sampleEpoch ?? 0,
		valid:
			partial.valid ??
			(typeof partial.percent === "number" && typeof partial.tokens === "number"),
		source: partial.source ?? "assistant-usage",
		contextWindow: partial.contextWindow ?? null,
		tokens: partial.tokens ?? null,
		percent: partial.percent ?? null,
		lastAssistantTimestamp: partial.lastAssistantTimestamp ?? null,
		lastRealActivityTimestamp: partial.lastRealActivityTimestamp ?? null,
		historyReads: partial.historyReads ?? 0,
	};
}

export function createEmptyUsageSnapshot(sessionId: string): UsageSnapshot {
	return createUsageSnapshot({
		sessionId,
		valid: false,
		source: "unknown",
		contextWindow: null,
		tokens: null,
		percent: null,
	});
}

export function createUsageCache(): UsageCache {
	return {
		bySession: new Map<string, UsageSnapshot>(),
		historyScanCount: 0,
	};
}

export function recordUsageSample(
	cache: UsageCache,
	input: {
		sessionId: string;
		compactionEpoch: number;
		getContextUsage: () => {
			tokens?: number | null;
			percent?: number | null;
			contextWindow?: number | null;
		};
		source: UsageSnapshot["source"];
		now: number;
	},
): UsageSnapshot {
	const current = cache.bySession.get(input.sessionId);
	const usage = input.getContextUsage() ?? {};
	const next = createUsageSnapshot({
		sessionId: input.sessionId,
		compactionEpoch: input.compactionEpoch,
		sampleEpoch: (current?.sampleEpoch ?? 0) + 1,
		valid:
			typeof usage.percent === "number" && typeof usage.tokens === "number",
		source: input.source,
		contextWindow: usage.contextWindow ?? null,
		tokens: usage.tokens ?? null,
		percent: usage.percent ?? null,
		lastAssistantTimestamp: input.now,
		lastRealActivityTimestamp: input.now,
		historyReads: current?.historyReads ?? 0,
	});
	cache.bySession.set(input.sessionId, next);
	return next;
}

export function invalidateUsageAfterCompaction(
	cache: UsageCache | string,
	sessionId?: string | number,
	compactionEpoch?: number,
): UsageSnapshot {
	if (typeof cache === "string") {
		return invalidateGlobalUsageAfterCompaction(cache, sessionId as number);
	}
	const current =
		cache.bySession.get(sessionId as string) ??
		createEmptyUsageSnapshot(sessionId as string);
	const next = createUsageSnapshot({
		...current,
		sessionId: sessionId as string,
		compactionEpoch: compactionEpoch ?? current.compactionEpoch,
		valid: false,
		source: "unknown",
		tokens: null,
		percent: null,
	});
	cache.bySession.set(sessionId as string, next);
	return next;
}

function invalidateGlobalUsageAfterCompaction(
	sessionId: string,
	compactionEpoch: number,
): UsageSnapshot {
	const current = usageBySession.get(sessionId) ?? createEmptyUsageSnapshot(sessionId);
	current.compactionEpoch = compactionEpoch;
	current.valid = false;
	current.source = "unknown";
	current.tokens = null;
	current.percent = null;
	return current;
}

export function getUsageSnapshot(sessionId: string): UsageSnapshot {
	const existing = usageBySession.get(sessionId);
	if (existing) return existing;
	const created = createEmptyUsageSnapshot(sessionId);
	usageBySession.set(sessionId, created);
	return created;
}

export function updateUsageSnapshot(
	sessionId: string,
	update: Partial<UsageSnapshot>,
	meta?: { source?: UsageSnapshot["source"]; timestamp?: number },
): UsageSnapshot {
	const current = getUsageSnapshot(sessionId);
	current.sampleEpoch += 1;
	current.compactionEpoch = update.compactionEpoch ?? current.compactionEpoch;
	current.valid = update.valid ?? typeof update.percent === "number";
	current.source = meta?.source ?? update.source ?? current.source;
	current.contextWindow = update.contextWindow ?? current.contextWindow;
	current.tokens = update.tokens ?? null;
	current.percent = update.percent ?? null;
	current.lastAssistantTimestamp = meta?.timestamp ?? current.lastAssistantTimestamp;
	current.lastRealActivityTimestamp = meta?.timestamp ?? current.lastRealActivityTimestamp;
	current.historyReads += 1;
	return current;
}

export function clearUsageSnapshots(): void {
	usageBySession.clear();
}

export function resetUsageCache(): void {
	clearUsageSnapshots();
}
