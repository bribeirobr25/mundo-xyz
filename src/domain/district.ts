/**
 * Ground measured from docs/prototypes/prototype-00.png.
 *
 * The reference is a 2:1 isometric drawing. Overlaying that grid on the picture
 * puts the canal on one band (about two cells wide) and the lawns on a repeating
 * module of a 4-cell block plus a 1-cell street. Screen corners are blocks or
 * streets, so the painter continues the same module past the 16×16 district.
 * Cream is only the street module and the canal banks.
 */

export const DISTRICT_W = 16;
export const DISTRICT_H = 16;

export type GroundKind = "grass" | "road" | "water" | "plaza" | "bridge";

export type Plot = { x: number; y: number; w: number; h: number };

/** Block plus the cream street on its far side. */
export const MODULE = 5;
export const BLOCK = 4;

/** One canal, centered on grid y = 8. Banks are the cream the polygon does not cover. */
export const WATER: Plot = { x: -24, y: 6.2, w: 64, h: 3.6 };

export const PLAZAS: Plot[] = [
  { x: 1, y: 1, w: 4, h: 3 },
  { x: 6, y: 0, w: 4, h: 2 },
  { x: 8, y: 2, w: 4, h: 3 },
];
export const PLAZA: Plot = PLAZAS[0] ?? { x: 1, y: 1, w: 4, h: 3 };

export const BRIDGES: Plot[] = [
  { x: 2, y: 6, w: 2, h: 4 },
  { x: 9, y: 6, w: 2, h: 4 },
];

/** Lawn rectangles the picture paints. Streets are the gaps this list leaves. */
export const GRASS_PLOTS: Plot[] = plotsCovering(-12, 28, -10, 24);

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function isFieldRow(y: number): boolean {
  if (y >= 5 && y <= 9) return false;
  const local = y < 5 ? y : y - 10;
  return mod(local, MODULE) < BLOCK;
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
  if (covers(WATER, x, y)) return "water";
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
