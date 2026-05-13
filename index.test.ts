import { describe, expect, it, vi } from "vitest";

import { DEFAULT_CONFIG, deriveAutoCompactPercent } from "./config";
import { CompactionCoordinator } from "./coordinator";
import { deliverPostCompactPrompt } from "./delivery-policy";
import { resolveCompactionEngine } from "./engine/resolver";
import { getState, restorePersistedState } from "./state";
import { immediateThreshold } from "./thresholds/immediate";
import { overflowThreshold } from "./thresholds/overflow";
import {
	clearUsageSnapshots,
	getUsageSnapshot,
	invalidateUsageAfterCompaction,
	updateUsageSnapshot,
} from "./usage-cache";

describe("immediate-compaction thresholds", () => {
	it("computes immediate threshold from auto compact + 1%", () => {
		const autoPercent = deriveAutoCompactPercent({
			contextWindow: 190_000,
			reserveTokens: 16_384,
		});
		const state = getState("session-immediate-threshold");
		state.lastPercent = autoPercent;
		const decision = immediateThreshold.evaluate(
			{
				sessionId: "s1",
				compactionEpoch: 0,
				sampleEpoch: 1,
				valid: true,
				source: "assistant-usage",
				contextWindow: 190_000,
				tokens: 176_000,
				percent: autoPercent + 1.2,
				lastAssistantTimestamp: Date.now(),
				lastRealActivityTimestamp: Date.now(),
				historyReads: 1,
			},
			{ autoCompactPercent: autoPercent, config: DEFAULT_CONFIG, state },
		);
		expect(decision?.kind).toBe("immediate");
	});

	it("fires overflow only when usage crosses above 100 percent", () => {
		const state = getState("session-overflow-threshold");
		state.lastPercent = 100;
		const decision = overflowThreshold.evaluate(
			{
				sessionId: "s2",
				compactionEpoch: 0,
				sampleEpoch: 1,
				valid: true,
				source: "assistant-usage",
				contextWindow: 200_000,
				tokens: 201_000,
				percent: 100.5,
				lastAssistantTimestamp: Date.now(),
				lastRealActivityTimestamp: Date.now(),
				historyReads: 1,
			},
			{ autoCompactPercent: 91, config: DEFAULT_CONFIG, state },
		);
		expect(decision?.kind).toBe("overflow");
	});
});

describe("immediate-compaction usage cache", () => {
	it("updates cached snapshots incrementally without history rescans", () => {
		clearUsageSnapshots();
		const first = updateUsageSnapshot(
			"cache-1",
			{ tokens: 100, percent: 10, contextWindow: 1000 },
			{ source: "assistant-usage", timestamp: 1 },
		);
		const second = updateUsageSnapshot(
			"cache-1",
			{ tokens: 110, percent: 11, contextWindow: 1000 },
			{ source: "estimated-trailing", timestamp: 2 },
		);
		expect(first).toBe(second);
		expect(second.sampleEpoch).toBe(2);
		expect(second.historyReads).toBe(2);
		expect(second.tokens).toBe(110);
	});

	it("invalidates usage after compaction until fresh usage arrives", () => {
		clearUsageSnapshots();
		updateUsageSnapshot(
			"cache-2",
			{ tokens: 150, percent: 15, contextWindow: 1000 },
			{ source: "assistant-usage", timestamp: 1 },
		);
		const invalid = invalidateUsageAfterCompaction("cache-2", 3);
		expect(invalid.valid).toBe(false);
		expect(invalid.percent).toBeNull();
		expect(invalid.compactionEpoch).toBe(3);
	});
});

describe("immediate-compaction coordinator", () => {
	it("prevents duplicate compaction while one is in flight", () => {
		const requests: Array<Record<string, unknown>> = [];
		const coordinator = new CompactionCoordinator(DEFAULT_CONFIG, {
			isStreaming: () => false,
			now: () => 1_000,
			requestCompaction(request) {
				requests.push(request);
			},
			deliverPrompt() {},
		});
		const state = getState("coord-1");
		state.lastPercent = 92.38;
		coordinator.evaluate(
			{
				sessionId: "coord-1",
				compactionEpoch: 0,
				sampleEpoch: 1,
				valid: true,
				source: "assistant-usage",
				contextWindow: 190_000,
				tokens: 176_000,
				percent: 93,
				lastAssistantTimestamp: 1,
				lastRealActivityTimestamp: 1,
				historyReads: 1,
			},
			state,
			91.38,
		);
		coordinator.evaluate(
			{
				sessionId: "coord-1",
				compactionEpoch: 0,
				sampleEpoch: 2,
				valid: true,
				source: "assistant-usage",
				contextWindow: 190_000,
				tokens: 177_000,
				percent: 93.2,
				lastAssistantTimestamp: 2,
				lastRealActivityTimestamp: 2,
				historyReads: 2,
			},
			state,
			91.38,
		);
		expect(requests).toHaveLength(1);
	});

	it("blocks threshold evaluation until fresh usage after compaction", () => {
		const coordinator = new CompactionCoordinator(DEFAULT_CONFIG, {
			isStreaming: () => false,
			now: () => 2_000,
			requestCompaction() {},
			deliverPrompt() {},
		});
		const state = getState("coord-2");
		coordinator.handleSessionCompact(state);
		expect(state.awaitingFreshUsage).toBe(true);
		const decision = coordinator.evaluate(
			{
				sessionId: "coord-2",
				compactionEpoch: 1,
				sampleEpoch: 1,
				valid: false,
				source: "unknown",
				contextWindow: null,
				tokens: null,
				percent: null,
				lastAssistantTimestamp: null,
				lastRealActivityTimestamp: 1,
				historyReads: 1,
			},
			state,
			91.38,
		);
		expect(decision).toBeNull();
		coordinator.handleFreshUsage(state, {
			tokens: 10,
			percent: 5,
			contextWindow: 100,
		});
		expect(state.awaitingFreshUsage).toBe(false);
	});
});

describe("immediate-compaction delivery policy", () => {
	it("uses sendUserMessage without deliverAs when idle", () => {
		const sendUserMessage = vi.fn();
		const sendMessage = vi.fn();
		deliverPostCompactPrompt(
			{
				isStreaming: false,
				sendUserMessage,
				sendMessage,
			},
			{
				kind: "immediate",
				message: "resume now",
				deliverAs: "followUp",
				triggerTurn: true,
			},
		);
		expect(sendUserMessage).toHaveBeenCalledWith("resume now");
		expect(sendMessage).not.toHaveBeenCalled();
	});

	it("uses custom message with followUp when streaming and triggerTurn is true", () => {
		const sendUserMessage = vi.fn();
		const sendMessage = vi.fn();
		deliverPostCompactPrompt(
			{
				isStreaming: true,
				sendUserMessage,
				sendMessage,
			},
			{
				kind: "overflow",
				message: "resume later",
				deliverAs: "followUp",
				triggerTurn: true,
			},
		);
		expect(sendMessage).toHaveBeenCalledWith(
			{
				customType: "immediate-compaction-overflow",
				content: "resume later",
				display: true,
			},
			{
				triggerTurn: true,
				deliverAs: "followUp",
			},
		);
		expect(sendUserMessage).not.toHaveBeenCalled();
	});
});

describe("immediate-compaction persistence and engine resolution", () => {
	it("restores persisted state from custom entries", () => {
		const state = restorePersistedState("persist-1", [
			{
				type: "custom",
				customType: "immediate-compaction-state",
				data: {
					compactionEpoch: 2,
					awaitingFreshUsage: true,
					cooldownUntil: 55,
				},
			},
		]);
		expect(state.compactionEpoch).toBe(2);
		expect(state.awaitingFreshUsage).toBe(true);
		expect(state.cooldownUntil).toBe(55);
	});

	it("falls back to core engine by default", async () => {
		const engine = await resolveCompactionEngine(DEFAULT_CONFIG, {});
		expect(engine.id).toBe("core");
	});

	it("keeps usage snapshot in memory per session id", () => {
		clearUsageSnapshots();
		const first = getUsageSnapshot("persist-2");
		const second = getUsageSnapshot("persist-2");
		expect(first).toBe(second);
	});
});
