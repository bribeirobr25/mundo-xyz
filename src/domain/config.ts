import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { LOCAL_ORIGIN } from "../local-dev.js";

export type RunMode = "local-test" | "production";
export type PublishAccess = "invite" | "test-any-authenticated" | null;

export type AppConfig = {
  runMode: RunMode;
  publishAccess: PublishAccess;
  promptMaxGraphemes: number;
  promptMaxUtf8Bytes: number;
  maxCombiningMarksPerGrapheme: number;
  proposalTtlHours: number;
  idempotencyRetentionDays: number;
  expiredTextPurgeDays: number;
  pollIntervalMs: number;
  interpretPerCapability: number;
  interpretWindowMinutes: number;
  interpretPerNetworkKey: number;
  interpretGlobalPerHour: number;
  publishPerAuthorPerDay: number;
  interpreterProvider: "openai";
  interpreterModel: string;
  interpreterActivation: "off";
  interpreterMonthlyBudgetUsd: number;
  interpreterEvalBudgetUsd: number;
  interpreterMaxInputTokens: number;
  interpreterMaxOutputTokens: number;
  interpreterPriceInputPerMTokUsd: number;
  interpreterPriceOutputPerMTokUsd: number;
  interpreterRegionalPremium: number;
  interpreterMaxConcurrent: number;
  interpreterKillSwitch: boolean;
  sessionMaxAgeDays: number;
  recoveryAttemptsPerNetworkKeyPerHour: number;
  inviteRedeemAttemptsPerNetworkKeyPerHour: number;
  inviteDefaultExpiryDays: number;
  inviteDefaultMaxRedemptions: number;
  catalogVersion: string;
  policyVersion: string;
  bounds: { w: number; h: number };
  dayStartHourUtc: number;
  nightStartHourUtc: number;
  weather: string;
  analytics: false;
  pepper: string;
  appOrigin: string;
};

export const LOCAL_TEST_PEPPER = "local-test-pepper-not-a-secret";

const REQUIRED = [
  "promptMaxGraphemes",
  "promptMaxUtf8Bytes",
  "maxCombiningMarksPerGrapheme",
  "proposalTtlHours",
  "idempotencyRetentionDays",
  "expiredTextPurgeDays",
  "pollIntervalMs",
  "interpretPerCapability",
  "interpretPerNetworkKey",
  "interpretGlobalPerHour",
  "publishPerAuthorPerDay",
  "interpreterProvider",
  "interpreterModel",
  "interpreterActivation",
  "interpreterMonthlyBudgetUsd",
  "interpreterEvalBudgetUsd",
  "interpreterMaxInputTokens",
  "interpreterMaxOutputTokens",
  "interpreterPriceInputPerMTokUsd",
  "interpreterPriceOutputPerMTokUsd",
  "interpreterRegionalPremium",
  "interpreterMaxConcurrent",
  "sessionMaxAgeDays",
  "catalogVersion",
  "policyVersion",
  "bounds",
  "weather",
] as const;

export function loadConfig(overrides: Partial<AppConfig> = {}, root = process.cwd()): AppConfig {
  const file = JSON.parse(readFileSync(resolve(root, "config/world.json"), "utf8")) as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...file, ...stripUndefined(overrides) };
  if (process.env.RUN_MODE && overrides.runMode === undefined) merged.runMode = process.env.RUN_MODE;
  for (const key of REQUIRED) {
    if (merged[key] === undefined || merged[key] === null) {
      throw new Error(`missing config: ${key}`);
    }
  }
  const runMode = merged.runMode;
  if (runMode !== "local-test" && runMode !== "production") throw new Error("missing config: runMode");
  const access = merged.publishAccess === undefined ? null : merged.publishAccess;
  if (access !== null && access !== "invite" && access !== "test-any-authenticated") {
    throw new Error("unknown publishAccess");
  }
  if (merged.interpreterActivation !== "off") throw new Error("interpreter activation is not approved");
  if (merged.interpreterProvider !== "openai") throw new Error("missing config: interpreterProvider");
  if (merged.analytics !== false) throw new Error("analytics is not enabled");
  const envPepper = process.env.PEPPER;
  let pepper = overrides.pepper ?? envPepper ?? "";
  if (runMode === "production") {
    if (!pepper) throw new Error("missing config: pepper");
    if (pepper === LOCAL_TEST_PEPPER) throw new Error("missing config: pepper");
    if (access === "test-any-authenticated") throw new Error("production refuses test publish access");
  } else if (!pepper) {
    pepper = LOCAL_TEST_PEPPER;
  }
  const appOrigin = overrides.appOrigin ?? process.env.APP_ORIGIN ?? LOCAL_ORIGIN;
  return { ...(merged as unknown as AppConfig), runMode, publishAccess: access as PublishAccess, pepper, appOrigin };
}

function stripUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined));
}

export function worstCaseUsd(config: AppConfig): number {
  const base =
    (config.interpreterMaxInputTokens / 1_000_000) * config.interpreterPriceInputPerMTokUsd +
    (config.interpreterMaxOutputTokens / 1_000_000) * config.interpreterPriceOutputPerMTokUsd;
  return Number((base * (1 + config.interpreterRegionalPremium)).toFixed(6));
}
