/**
 * Ground measured from docs/prototypes/prototype-00.png.
 *
 * The reference is a 2:1 isometric drawing. Lawns repeat as a 4-cell block plus
 * a 1-cell street. The canal is not one of those rows: on the picture it is a
 * single diagonal band, entering the left edge about a third of the way down
 * and leaving through the bottom edge right of center. Its corners below are
 * that band, read back into grid space at the wide camera. Cream is the street
 * module plus a thin bank around the canal.
 */

export const DISTRICT_W = 16;
export const DISTRICT_H = 16;

export type GroundKind = "grass" | "road" | "water" | "plaza" | "bridge";

export type Plot = { x: number; y: number; w: number; h: number };

export type CornerName = "top" | "right" | "bottom" | "left";

/**
 * Corners where prototype 00 is street and the repeating block is lawn.
 * Each cut is in cells, taken off that corner of the named block.
 */
export const CORNER_CUTS: { x: number; y: number; corner: CornerName; cells: number }[] = [
  { x: 5, y: 10, corner: "left", cells: 1.8 },
  { x: 5, y: 10, corner: "bottom", cells: 1.8 },
  { x: 10, y: 10, corner: "top", cells: 0.85 },
  { x: 5, y: 5, corner: "top", cells: 0.8 },
  { x: 5, y: 5, corner: "left", cells: 0.8 },
  { x: 0, y: 5, corner: "bottom", cells: 0.9 },
  { x: 0, y: 0, corner: "bottom", cells: 0.7 },
  { x: 0, y: 0, corner: "left", cells: 0.7 },
  { x: 5, y: -10, corner: "bottom", cells: 1.3 },
  { x: 5, y: -5, corner: "right", cells: 1.3 },
];

/** Block plus the cream street on its far side. */
export const MODULE = 5;
export const BLOCK = 4;

/** Canal water, a closed quad in grid space. Not an axis-aligned row. */
export const CANAL: Array<[number, number]> = [
  [-8.81, 6.95],
  [18.52, 9.38],
  [17.44, 7.39],
  [-9.89, 4.96],
];

/** Cream embankment, the same diagonal a little wider than the water. */
export const CANAL_BANK: Array<[number, number]> = [
  [-8.54, 7.44],
  [18.79, 9.88],
  [17.17, 6.89],
  [-10.15, 4.46],
];

/** Bounds kept for callers that still want a rectangle. The painter uses CANAL. */
export const WATER: Plot = { x: -10, y: 5, w: 30, h: 5 };

export const PLAZAS: Plot[] = [
  { x: 1, y: 1, w: 4, h: 3 },
  { x: 6, y: 0, w: 4, h: 2 },
  { x: 8, y: 2, w: 4, h: 3 },
];
export const PLAZA: Plot = PLAZAS[0] ?? { x: 1, y: 1, w: 4, h: 3 };

export const BRIDGES: Plot[] = [
  { x: 1, y: 6, w: 2, h: 1 },
  { x: 7, y: 7, w: 2, h: 1 },
];

/** Lawn rectangles the picture paints. Streets are the gaps this list leaves. */
export const GRASS_PLOTS: Plot[] = plotsCovering(-12, 28, -10, 24);

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function isFieldRow(y: number): boolean {
  return mod(y, MODULE) < BLOCK;
}

export function pointInPoly(x: number, y: number, poly: Array<[number, number]>): boolean {
  let hit = false;
  let j = poly.length - 1;
  for (let i = 0; i < poly.length; i += 1) {
    const xi = poly[i]?.[0] ?? 0;
    const yi = poly[i]?.[1] ?? 0;
    const xj = poly[j]?.[0] ?? 0;
    const yj = poly[j]?.[1] ?? 0;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi) hit = !hit;
    j = i;
  }
  return hit;
}

export function isFieldColumn(x: number): boolean {
  return mod(x, MODULE) < BLOCK;
}

function plotsCovering(x0: number, x1: number, y0: number, y1: number): Plot[] {
  const plots: Plot[] = [];
  let y = y0;
  while (y < y1) {
    if (!isFieldRow(y)) {
      y += 1;
      continue;
    }
    const yStart = y;
    while (y < y1 && isFieldRow(y)) y += 1;
    const yEnd = y;
    let x = x0;
    while (x < x1) {
      if (!isFieldColumn(x)) {
        x += 1;
        continue;
      }
      const xStart = x;
      while (x < x1 && isFieldColumn(x)) x += 1;
      plots.push({ x: xStart, y: yStart, w: x - xStart, h: yEnd - yStart });
    }
  }
  return plots;
}

function covers(plot: Plot, x: number, y: number): boolean {
  return x >= plot.x && y >= plot.y && x < plot.x + plot.w && y < plot.y + plot.h;
}

export function groundKind(x: number, y: number): GroundKind {
  if (BRIDGES.some((plot) => covers(plot, x, y))) return "bridge";
  if (pointInPoly(x + 0.5, y + 0.5, CANAL)) return "water";
  if (PLAZAS.some((plot) => covers(plot, x, y))) return "plaza";
  if (isFieldColumn(x) && isFieldRow(y)) return "grass";
  return "road";
}

const CODE: Record<GroundKind, string> = {
  grass: "g",
  road: "r",
  water: "w",
  plaza: "p",
  bridge: "b",
};

export function districtRows(): string[] {
  return Array.from({ length: DISTRICT_H }, (_, y) =>
    Array.from({ length: DISTRICT_W }, (_, x) => CODE[groundKind(x, y)]).join(""),
  );
}
