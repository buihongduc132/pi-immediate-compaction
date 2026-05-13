import type { CompactionEngine } from "../types";

export const piVccCompactionAdapter: CompactionEngine = {
	id: "pi-vcc",
	async detect() {
		return false;
	},
	requestCompaction(ctx, request) {
		ctx.compact(request);
	},
};
