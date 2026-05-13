import { describe, expect, it, vi } from "vitest";

import {
	clearUsageSnapshots,
	createUsageCache,
	createUsageSnapshot,
	getUsageSnapshot,
	invalidateUsageAfterCompaction,
	recordUsageSample,
	updateUsageSnapshot,
} from "./usage-cache";

describe("usage cache", () => {
	it("updates an in-memory snapshot incrementally and never rescans history", () => {
		const cache = createUsageCache();
		const getContextUsage = vi.fn(() => ({
			tokens: 123_000,
			percent: 64.7,
			contextWindow: 190_000,
		}));

		const first = recordUsageSample(cache, {
			sessionId: "session-1",
			compactionEpoch: 0,
			getContextUsage,
			source: "assistant-usage",
			now: 1,
		});
		const second = recordUsageSample(cache, {
			sessionId: "session-1",
			compactionEpoch: 0,
			getContextUsage,
			source: "assistant-usage",
			now: 2,
		});

		expect(first.sampleEpoch).toBe(1);
		expect(second.sampleEpoch).toBe(2);
		expect(cache.bySession.size).toBe(1);
		expect(getContextUsage).toHaveBeenCalledTimes(2);
		expect(cache.historyScanCount).toBe(0);
	});

	it("marks usage invalid after compaction and waits for fresh usage", () => {
		const cache = createUsageCache();
		cache.bySession.set(
			"session-1",
			createUsageSnapshot({
				sessionId: "session-1",
				compactionEpoch: 2,
				sampleEpoch: 4,
				valid: true,
				source: "assistant-usage",
				contextWindow: 190_000,
				tokens: 175_000,
				percent: 92.1,
			}),
		);

		const invalidated = invalidateUsageAfterCompaction(cache, "session-1", 3);

		expect(invalidated.valid).toBe(false);
		expect(invalidated.source).toBe("unknown");
		expect(invalidated.tokens).toBeNull();
		expect(invalidated.percent).toBeNull();
		expect(invalidated.compactionEpoch).toBe(3);
	});

	it("reuses the same global snapshot object per session id", () => {
		clearUsageSnapshots();
		const first = getUsageSnapshot("global-1");
		const second = getUsageSnapshot("global-1");
		expect(first).toBe(second);
	});

	it("tracks global incremental historyReads across updates", () => {
		clearUsageSnapshots();
		const first = updateUsageSnapshot(
			"global-2",
			{ percent: 10, tokens: 100, contextWindow: 1_000, valid: true },
			{ source: "assistant-usage", timestamp: 10 },
		);
		const second = updateUsageSnapshot(
			"global-2",
			{ percent: 11, tokens: 110, contextWindow: 1_000, valid: true },
			{ source: "estimated-trailing", timestamp: 20 },
		);
		expect(first).toBe(second);
		expect(second.historyReads).toBe(2);
		expect(second.lastAssistantTimestamp).toBe(20);
	});
});
