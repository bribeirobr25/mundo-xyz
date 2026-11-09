/** Prototype 00 ground: large rounded lawns, cream streets, a wide left-hand canal. */

export const DISTRICT_W = 16;
export const DISTRICT_H = 16;

export type GroundKind = "grass" | "road" | "water" | "plaza" | "bridge";

export type Plot = { x: number; y: number; w: number; h: number };

/** Lawns. Cream streets and canal banks are the cells these plots do not cover. */
export const GRASS_PLOTS: Plot[] = [
  { x: 1, y: 1, w: 5, h: 4 },
  { x: 7, y: 1, w: 4, h: 4 },
  { x: 11, y: 1, w: 4, h: 4 },
  { x: 1, y: 10, w: 5, h: 5 },
  { x: 11, y: 6, w: 4, h: 3 },
  { x: 9, y: 10, w: 6, h: 5 },
];

/** Canal on the far bank. The right-hand land stays continuous so the café and tower share it. */
export const WATER: Plot = { x: 0, y: 6, w: 8, h: 3 };
export const PLAZA: Plot = { x: 8, y: 7, w: 3, h: 2 };
export const BRIDGES: Plot[] = [
  { x: 2, y: 6, w: 1, h: 3 },
  { x: 5, y: 6, w: 1, h: 3 },
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
