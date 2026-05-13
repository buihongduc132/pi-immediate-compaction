import type { ImmediateCompactionConfig } from "../types";
import { piVccCompactionAdapter } from "./adapters/pi-vcc";
import { commandCompactionEngine } from "./command-engine";
import { coreCompactionEngine } from "./core-engine";
import type { CompactionEngine } from "./types";

export async function resolveCompactionEngine(
	config: ImmediateCompactionConfig,
	ctx: unknown,
): Promise<CompactionEngine> {
	if (config.engine.kind === "core") return coreCompactionEngine;
	if (config.engine.kind === "command") return commandCompactionEngine;
	if (await piVccCompactionAdapter.detect(ctx)) return piVccCompactionAdapter;
	return coreCompactionEngine;
}
