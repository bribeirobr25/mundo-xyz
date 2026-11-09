/** Prototype 00 ground, inspected from the image: grass plots, broad paths, a canal, two bridges, one plaza. */

export const DISTRICT_W = 16;
export const DISTRICT_H = 16;

export type GroundKind = "grass" | "road" | "water" | "plaza" | "bridge";

const BRIDGE_CELLS = new Set(["4,4", "5,4", "8,8", "9,8"]);

export function groundKind(x: number, y: number): GroundKind {
  const inside = x >= 0 && y >= 0 && x < DISTRICT_W && y < DISTRICT_H;
  if (inside && BRIDGE_CELLS.has(`${x},${y}`)) return "bridge";
  if (x - y === 0 || x - y === 1) return "water";
  if (inside && x >= 2 && x <= 3 && y >= 6 && y <= 7) return "plaza";
  if (x % 4 === 0 || y % 4 === 0) return "road";
  return "grass";
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
