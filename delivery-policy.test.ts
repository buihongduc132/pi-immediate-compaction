import { describe, expect, it, vi } from "vitest";

import { deliverPostCompactionPrompt } from "./delivery-policy";

describe("delivery policy", () => {
	it("sends idle prompts via sendUserMessage without deliverAs", async () => {
		const pi = {
			sendUserMessage: vi.fn(),
			sendMessage: vi.fn(),
		};

		await deliverPostCompactionPrompt(pi as never, {
			kind: "immediate",
			prompt: "Continue from compacted state",
			isStreaming: false,
			deliverAs: "followUp",
			triggerTurn: true,
		});

		expect(pi.sendUserMessage).toHaveBeenCalledWith(
			"Continue from compacted state",
		);
		expect(pi.sendMessage).not.toHaveBeenCalled();
	});

	it("queues streaming prompts with configured deliverAs and triggerTurn", async () => {
		const pi = {
			sendUserMessage: vi.fn(),
			sendMessage: vi.fn(),
		};

		await deliverPostCompactionPrompt(pi as never, {
			kind: "overflow",
			prompt: "Continue carefully",
			isStreaming: true,
			deliverAs: "followUp",
			triggerTurn: true,
		});

		expect(pi.sendMessage).toHaveBeenCalledWith(
			{
				customType: "immediate-compaction",
				content: "Continue carefully",
				display: true,
				details: {
					kind: "overflow",
					origin: "immediate-compaction",
				},
			},
			{
				triggerTurn: true,
				deliverAs: "followUp",
			},
		);
		expect(pi.sendUserMessage).not.toHaveBeenCalled();
	});
});
