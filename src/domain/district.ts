/** Prototype 00 ground: large axis-aligned lawns, cream streets, one full-width canal. */

export const DISTRICT_W = 16;
export const DISTRICT_H = 16;

export type GroundKind = "grass" | "road" | "water" | "plaza" | "bridge";

export type Plot = { x: number; y: number; w: number; h: number };

/** Lawns. Cream streets and canal banks are the cells these plots do not cover. */
export const GRASS_PLOTS: Plot[] = [
  { x: 1, y: 0, w: 5, h: 4 },
  { x: 8, y: 0, w: 6, h: 4 },
  { x: 1, y: 11, w: 5, h: 6 },
  { x: 8, y: 11, w: 6, h: 6 },
];

/** One channel across the district. Cream banks are the unpainted rows above and below it. */
export const WATER: Plot = { x: 0, y: 6, w: 16, h: 3 };
export const PLAZA: Plot = { x: 8, y: 1, w: 2, h: 2 };
export const BRIDGES: Plot[] = [
  { x: 2, y: 6, w: 2, h: 3 },
  { x: 10, y: 6, w: 2, h: 3 },
];

function covers(plot: Plot, x: number, y: number): boolean {
  return x >= plot.x && y >= plot.y && x < plot.x + plot.w && y < plot.y + plot.h;
}

export function groundKind(x: number, y: number): GroundKind {
  if (BRIDGES.some((plot) => covers(plot, x, y))) return "bridge";
  if (covers(WATER, x, y)) return "water";
  const inside = x >= 0 && y >= 0 && x < DISTRICT_W && y < DISTRICT_H;
  if (!inside) return "road";
  if (covers(PLAZA, x, y)) return "plaza";
  if (GRASS_PLOTS.some((plot) => covers(plot, x, y))) return "grass";
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
