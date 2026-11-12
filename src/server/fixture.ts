import type { PortResult } from "../domain/types.js";

const BUS = "a bus stop for the café's regulars.";
const BUS_ASCII = "a bus stop for the cafe's regulars.";

/** Deterministic test double. Not the product interpreter. */
export function fixtureInterpret(text: string, anchorId: string | null): PortResult {
  const lower = text.normalize("NFC").replace(/[\u2018\u2019\u02BC]/g, "'").toLowerCase();
  if (/\b(ignore previous|system prompt|you are now)\b/.test(lower)) return { kind: "unsupported" };
  if (/\b(not|don't|dont|never|no)\b/.test(lower)) return { kind: "unsupported" };
  if (/\b(inside|interior|payment|price|buy|sell|dollar)\b/.test(lower)) return { kind: "unsupported" };
  const mentionsBus = lower.includes("bus stop");
  const mentionsCafe = lower.includes("café") || lower.includes("cafe");
  if (mentionsBus && mentionsCafe && /\band\b/.test(lower) && !lower.startsWith("a bus stop for")) {
    return { kind: "invalidOutput", reason: "multi" };
  }
  if (lower === BUS || lower === BUS_ASCII) {
    return {
      kind: "supported",
      explanationKey: "template.placed",
      action: { type: "PlaceObject", assetId: "bus_stop", anchorId, relation: "next_to" },
    };
  }
  if (lower === "leave it as it is") return { kind: "no_change" };
  if (lower === "which spot") return { kind: "clarification" };
  return { kind: "unsupported" };
}
