import type { CatalogAsset } from "./action.js";
import type { Relation } from "./types.js";

export type Cell = { x: number; y: number };
export type Occupant = { x: number; y: number; w: number; h: number; hidden: boolean };

export function place(
  asset: CatalogAsset,
  anchor: Cell | null,
  relation: Relation,
  occupants: Occupant[],
  bounds: { w: number; h: number },
  skip = 0,
): Cell | null {
  const [fw, fh] = asset.footprint;
  const origin = anchor ?? { x: 1, y: 1 };
  const minR = relation === "near" ? 2 : 1;
  const found: Cell[] = [];
  const maxR = bounds.w + bounds.h;
  for (let r = anchor ? minR : 0; r <= maxR; r++) {
    const ring: Cell[] = [];
    for (let y = 0; y <= bounds.h - fh; y++) {
      for (let x = 0; x <= bounds.w - fw; x++) {
        const dist = Math.max(Math.abs(x - origin.x), Math.abs(y - origin.y));
        if (dist !== r) continue;
        if (overlaps(x, y, fw, fh, occupants)) continue;
        ring.push({ x, y });
      }
    }
    ring.sort((a, b) => score(a, origin, relation) - score(b, origin, relation) || a.y - b.y || a.x - b.x);
    found.push(...ring);
  }
  return found[skip] ?? null;
}

function score(cell: Cell, origin: Cell, relation: Relation): number {
  if (relation === "across_from") return cell.x < origin.x ? 0 : 1;
  if (relation === "next_to") return -(cell.x + cell.y);
  return 0;
}

function overlaps(x: number, y: number, w: number, h: number, occupants: Occupant[]): boolean {
  for (const o of occupants) {
    if (x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y) return true;
  }
  return false;
}
