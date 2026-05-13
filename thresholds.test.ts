import { describe, expect, it } from "vitest";

import { DEFAULT_CONFIG } from "./config";
import { createCoordinatorState } from "./state";
import { createImmediateThreshold } from "./thresholds/immediate";
import { createOverflowThreshold } from "./thresholds/overflow";
import { createThresholdRegistry } from "./thresholds/registry";
import { normalizeThresholdArgs } from "./thresholds/types";
import { createUsageSnapshot } from "./usage-cache";

describe("threshold modules", () => {
	it("immediate threshold lives in its own module and arms only above auto+offset", () => {
		const threshold = createImmediateThreshold();
		const below = createUsageSnapshot({
			sessionId: "s1",
			percent: 92.37,
			contextWindow: 190_000,
			tokens: 175_515,
		});
		const above = createUsageSnapshot({
			sessionId: "s1",
			percent: 92.38,
			contextWindow: 190_000,
			tokens: 175_516,
		});

		expect(
			threshold.evaluate(below, DEFAULT_CONFIG, createCoordinatorState()),
		).toBeNull();
		expect(
			threshold.evaluate(above, DEFAULT_CONFIG, createCoordinatorState()),
		).toMatchObject({ kind: "immediate" });
	});

	it("overflow threshold lives in its own module and only fires above 100 percent", () => {
		const threshold = createOverflowThreshold();
		const atLimit = createUsageSnapshot({
			sessionId: "s1",
			percent: 100,
			contextWindow: 190_000,
			tokens: 190_000,
		});
		const above = createUsageSnapshot({
			sessionId: "s1",
			percent: 100.01,
			contextWindow: 190_000,
			tokens: 190_019,
		});

		expect(
			threshold.evaluate(atLimit, DEFAULT_CONFIG, createCoordinatorState()),
		).toBeNull();
		expect(
			threshold.evaluate(above, DEFAULT_CONFIG, createCoordinatorState()),
		).toMatchObject({ kind: "overflow" });
	});

	it("threshold registry returns both swappable threshold implementations", () => {
		const registry = createThresholdRegistry();
		expect(registry.map((entry) => entry.id)).toEqual([
			"immediate",
			"overflow",
		]);
	});

	it("normalizeThresholdArgs preserves trigger evaluation context", () => {
		const state = createCoordinatorState();
		const normalized = normalizeThresholdArgs(DEFAULT_CONFIG, state);
		expect(normalized.config).toBe(DEFAULT_CONFIG);
		expect(normalized.state).toBe(state);
		expect(normalized.autoCompactPercent).toBeCloseTo(91.37684210526316, 8);
	});
});
