import { immediateThreshold } from "./immediate";
import { overflowThreshold } from "./overflow";
import type { ThresholdLogic } from "./types";

export function createThresholdRegistry(): ThresholdLogic[] {
	return [immediateThreshold, overflowThreshold];
}
