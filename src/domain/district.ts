/** Prototype 00 ground, inspected from the image: grass plots, broad paths, a canal, two bridges, one plaza. */

export const DISTRICT_W = 16;
export const DISTRICT_H = 16;

export type GroundKind = "grass" | "road" | "water" | "plaza" | "bridge";

const BRIDGE_CELLS = new Set(["4,8", "4,9", "4,10", "9,8", "9,9", "9,10"]);

export function groundKind(x: number, y: number): GroundKind {
  const inside = x >= 0 && y >= 0 && x < DISTRICT_W && y < DISTRICT_H;
  if (inside && BRIDGE_CELLS.has(`${x},${y}`)) return "bridge";
  if (y >= 8 && y <= 10) return "water";
  if (inside && x >= 3 && x <= 4 && y >= 5 && y <= 6) return "plaza";
  if (((x % 4) + 4) % 4 === 0 || ((y % 4) + 4) % 4 === 0) return "road";
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
