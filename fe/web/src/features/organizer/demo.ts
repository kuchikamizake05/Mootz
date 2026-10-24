import type { Hex } from "viem";
import { classify, type Recognition } from "./logic";

/** Fixture-only data for the labelled Demo mode. No chain reads; addresses are synthetic. */
export const DEMO_ADDRESS = "0xF00dBabE00000000000000000000000000000F0F" as const;
const DEMO_EVENT_ID = `0x${"ab".repeat(32)}` as Hex;

export type DemoScenario = "alumni" | "nonholder" | "error";

export async function runDemo(scenario: DemoScenario): Promise<Recognition> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  if (scenario === "error") throw new Error("Demo RPC error");
  return scenario === "alumni" ? classify(DEMO_EVENT_ID, 1n, 1n) : classify(DEMO_EVENT_ID, 0n, 0n);
}
