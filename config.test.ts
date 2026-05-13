import { describe, expect, it } from "vitest";

import {
	DEFAULT_CONFIG,
	computeAutoCompactPercent,
	computeImmediatePercent,
	loadConfig,
} from "./config";

describe("immediate-compaction config", () => {
	it("defaults immediate threshold to auto + 1 percent", () => {
		const autoPercent = computeAutoCompactPercent({
			contextWindow: 190_000,
			reserveTokens: 16_384,
		});

		expect(autoPercent).toBeCloseTo(91.37684210526316, 8);
		expect(
			computeImmediatePercent({
				contextWindow: 190_000,
				reserveTokens: 16_384,
				offsetPercentFromAuto:
					DEFAULT_CONFIG.immediate.offsetPercentFromAuto,
			}),
		).toBeCloseTo(92.37684210526316, 8);
	});

	it("defaults overflow threshold to over 100 percent", () => {
		expect(DEFAULT_CONFIG.overflow.percent).toBe(100);
	});

	it("uses default context window and reserve tokens when omitted", () => {
		expect(computeAutoCompactPercent({})).toBeCloseTo(91.37684210526316, 8);
	});

	it("returns zero when context window is non-positive", () => {
		expect(
			computeAutoCompactPercent({ contextWindow: 0, reserveTokens: 16_384 }),
		).toBe(0);
	});

	it("adds autoCompactPercent to loaded config", () => {
		const loaded = loadConfig(process.cwd());
		expect(loaded.autoCompactPercent).toBeCloseTo(91.37684210526316, 8);
	});
});
