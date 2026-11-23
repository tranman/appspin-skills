import { defineConfig } from "@playwright/test";

// A default address would let a forgotten ORIGIN pass against another copy, such as staging.
const origin = process.env.ORIGIN;
if (!origin) throw new Error("ORIGIN is not set: give the address of the copy to test, such as a local one or staging");

// No retries: a pass on a retry hides a flaky test. One worker: tests share the copy's data, so in parallel they race.
export default defineConfig({ testMatch: "**/*.e2e.ts", retries: 0, workers: 1, outputDir: "results", use: { baseURL: origin } });
