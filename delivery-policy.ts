import type { DeliveryMode, TriggerKind } from "./types";

type RuntimeLike = {
	isStreaming: boolean;
	sendUserMessage: (content: string, options?: { deliverAs?: DeliveryMode }) => void;
	sendMessage: (
		message: { customType: string; content: string; display: boolean },
		options: { triggerTurn?: boolean; deliverAs?: DeliveryMode },
	) => void;
};

type PromptRequest = {
	kind: TriggerKind;
	message: string;
	deliverAs?: DeliveryMode;
	triggerTurn?: boolean;
};

export function deliverPostCompactPrompt(
	runtime: RuntimeLike,
	request: PromptRequest,
): void {
	if (!runtime.isStreaming) {
		runtime.sendUserMessage(request.message);
		return;
	}
	const customType =
		request.kind === "overflow"
			? "immediate-compaction-overflow"
			: "immediate-compaction";
	runtime.sendMessage(
		{
			customType,
			content: request.message,
			display: true,
		},
		{
			triggerTurn: request.triggerTurn,
			deliverAs: request.deliverAs ?? "followUp",
		},
	);
}

export async function deliverPostCompactionPrompt(
	pi: RuntimeLike,
	request: {
		kind: TriggerKind;
		prompt: string;
		isStreaming: boolean;
		deliverAs: DeliveryMode;
		triggerTurn: boolean;
	},
): Promise<void> {
	if (!request.isStreaming) {
		pi.sendUserMessage(request.prompt);
		return;
	}

	pi.sendMessage(
		{
			customType: "immediate-compaction",
			content: request.prompt,
			display: true,
			details: {
				kind: request.kind,
				origin: "immediate-compaction",
			},
		} as any,
		{
			triggerTurn: request.triggerTurn,
			deliverAs: request.deliverAs,
		},
	);
}
