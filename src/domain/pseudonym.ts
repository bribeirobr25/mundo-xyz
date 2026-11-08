const ALLOWED = /^[\p{L}\p{N} _.-]+$/u;

export function checkPseudonym(raw: string): { ok: true; display: string; skeleton: string } | { ok: false } {
  const display = raw.normalize("NFKC").trim().replace(/\s+/g, " ");
  const graphemes = [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(display)];
  if (graphemes.length < 2 || graphemes.length > 24) return { ok: false };
  if (!ALLOWED.test(display)) return { ok: false };
  if (display.includes("@")) return { ok: false };
  return { ok: true, display, skeleton: skeletonOf(display) };
}

export function skeletonOf(display: string): string {
  const map: Record<string, string> = { "0": "o", "1": "l", "3": "e", "5": "s", "@": "a", $: "s" };
  return display
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ _.-]/g, "")
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("");
}

export function publicName(pseudonym: string, authorId: string, hidden: boolean): string {
  if (hidden) return "a contributor";
  return `${pseudonym} #${authorId.slice(0, 4)}`;
}
