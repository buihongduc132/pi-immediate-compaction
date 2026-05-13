import { describe, expect, it, vi } from "vitest";

import { DEFAULT_CONFIG } from "./config";
import {
	CompactionCoordinator,
	createCoordinator,
	markCompactionFinished,
	maybeTriggerCompaction,
} from "./coordinator";
import { createUsageSnapshot } from "./usage-cache";

describe("coordinator", () => {
	it("enforces single-flight compaction and only triggers once while in flight", () => {
		const coordinator = createCoordinator();
		const engine = {
			requestCompaction: vi.fn(),
		};
		const snapshot = createUsageSnapshot({
			sessionId: "session-1",
			valid: true,
			contextWindow: 190_000,
			tokens: 190_100,
			percent: 100.05,
		});

		const first = maybeTriggerCompaction(coordinator, {
			config: DEFAULT_CONFIG,
			snapshot,
			engine,
			isStreaming: false,
		});
		const second = maybeTriggerCompaction(coordinator, {
			config: DEFAULT_CONFIG,
			snapshot,
			engine,
			isStreaming: false,
		});

		expect(first).toMatchObject({ triggered: true, state: "compacting" });
		expect(second).toMatchObject({ triggered: false, state: "compacting" });
		expect(engine.requestCompaction).toHaveBeenCalledTimes(1);
	});

	it("moves into awaiting_fresh_usage after compaction finishes", () => {
		const coordinator = createCoordinator();
		markCompactionFinished(coordinator, {
			now: 10,
			cooldownMs: DEFAULT_CONFIG.cooldown.minMsBetweenCompactions,
		});

		expect(coordinator.state).toBe("awaiting_fresh_usage");
		expect(coordinator.awaitingFreshUsage).toBe(true);
	});

	it("does not trigger while usage is invalid after session_compact", () => {
		const coordinator = createCoordinator();
		const engine = {
			requestCompaction: vi.fn(),
		};
		const snapshot = createUsageSnapshot({
			sessionId: "session-1",
			valid: false,
			source: "unknown",
			contextWindow: null,
			tokens: null,
			percent: null,
		});

		const result = maybeTriggerCompaction(coordinator, {
			config: DEFAULT_CONFIG,
			snapshot,
			engine,
			isStreaming: false,
		});

		expect(result).toMatchObject({
			triggered: false,
			reason: "awaiting-fresh-usage",
		});
		expect(engine.requestCompaction).not.toHaveBeenCalled();
	});

	it("records trigger metadata when threshold crosses", () => {
		const runtime = {
			isStreaming: () => false,
			now: () => 99,
			requestCompaction: vi.fn(),
		};
		const coordinator = new CompactionCoordinator(DEFAULT_CONFIG, runtime);
		const result = coordinator.evaluate(
			createUsageSnapshot({
				sessionId: "coord-meta",
				valid: true,
				contextWindow: 190_000,
				tokens: 190_100,
				percent: 100.05,
			}),
		);
		expect(result).toMatchObject({ triggered: true, state: "compacting" });
		expect(coordinator.details.lastTriggeredKind).toBe("immediate");
		expect(coordinator.details.lastTriggeredAt).toBe(99);
	});

	it("returns no-threshold-cross when valid usage stays below thresholds", () => {
		const runtime = {
			isStreaming: () => false,
			now: () => 10,
			requestCompaction: vi.fn(),
		};
		const coordinator = new CompactionCoordinator(DEFAULT_CONFIG, runtime);
		const result = coordinator.evaluate(
			createUsageSnapshot({
				sessionId: "coord-low",
				valid: true,
				contextWindow: 190_000,
				tokens: 100_000,
				percent: 50,
			}),
		);
		expect(result).toMatchObject({
			triggered: false,
			reason: "no-threshold-cross",
		});
	});
});
