import { createHash } from "node:crypto";

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function fingerprint(parts: {
  proposalId: string;
  proposalVersion: number;
  action: unknown;
  authorId: string;
  catalogVersion: string;
  policyVersion: string;
}): string {
  return createHash("sha256").update(canonical(parts)).digest("hex");
}
