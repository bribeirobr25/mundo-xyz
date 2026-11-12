import type { AppConfig } from "./config.js";

const Bidi = /[\u202A-\u202E\u2066-\u2069\uFEFF]/u;
const Tag = /\u{E0001}|[\u{E0020}-\u{E007F}]/u;
const Controls = /[\u0000-\u001F\u007F-\u009F]/u;
const Email = /[^\s@]+@[^\s@]+\.[^\s@]+/u;
const Phone = /(?:\+?1[-. ]?)?(?:\(\d{3}\)|\b\d{3}\b)[-. ]\d{3}[-. ]\d{4}\b|\b\d{10}\b/;

export type InputOk = { ok: true; text: string; graphemes: number };
export type InputErr = { ok: false; code: "empty" | "limits" | "pii" | "controls" };

export function normalizeInput(raw: string, config: AppConfig): InputOk | InputErr {
  const text = raw.normalize("NFC").trim();
  if (!text) return { ok: false, code: "empty" };
  if (Controls.test(text) || Bidi.test(text) || Tag.test(text)) return { ok: false, code: "controls" };
  if (hasIllegalZwj(text)) return { ok: false, code: "controls" };
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  const graphemes = [...segmenter.segment(text)].map((s) => s.segment);
  if (graphemes.length > config.promptMaxGraphemes) return { ok: false, code: "limits" };
  if (Buffer.byteLength(text, "utf8") > config.promptMaxUtf8Bytes) return { ok: false, code: "limits" };
  for (const g of graphemes) {
    const marks = [...g].filter((ch) => /\p{M}/u.test(ch)).length;
    if (marks > config.maxCombiningMarksPerGrapheme) return { ok: false, code: "limits" };
  }
  if (Email.test(text) || Phone.test(text)) return { ok: false, code: "pii" };
  return { ok: true, text, graphemes: graphemes.length };
}

function hasIllegalZwj(text: string): boolean {
  if (!text.includes("\u200D")) return false;
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  for (const part of segmenter.segment(text)) {
    const g = part.segment;
    if (!g.includes("\u200D")) continue;
    const pieces = g.split("\u200D");
    if (pieces.some((p) => !/\p{Extended_Pictographic}/u.test(p))) return true;
  }
  return false;
}
