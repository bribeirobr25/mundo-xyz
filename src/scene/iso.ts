export const TILE_W = 128;
export const TILE_H = 64;
/** How much of the shorter viewport edge the focused footprint should fill. */
export const FOCUS_FRACTION = 0.62;

export function cellToScreen(x: number, y: number, zoom = 1): { sx: number; sy: number } {
  return {
    sx: (x - y) * (TILE_W / 2) * zoom,
    sy: (x + y) * (TILE_H / 2) * zoom,
  };
}

export function footprintQuad(
  x: number,
  y: number,
  w: number,
  h: number,
  zoom = 1,
): { sx: number; sy: number }[] {
  return [
    cellToScreen(x, y, zoom),
    cellToScreen(x + w, y, zoom),
    cellToScreen(x + w, y + h, zoom),
    cellToScreen(x, y + h, zoom),
  ];
}

/** Ground quad plus the mass above it, so the roof is part of the target and the next cell is not. */
export function buildingHit(quad: { sx: number; sy: number }[], rise: number): { sx: number; sy: number }[] {
  const north = quad[0];
  const east = quad[1];
  const south = quad[2];
  const west = quad[3];
  if (!north || !east || !south || !west) return quad;
  return [
    { sx: north.sx, sy: north.sy - rise },
    { sx: east.sx, sy: east.sy - rise * 0.2 },
    { sx: south.sx, sy: south.sy },
    { sx: west.sx, sy: west.sy - rise * 0.2 },
  ];
}

export function pointInPoly(px: number, py: number, poly: { sx: number; sy: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (!a || !b) continue;
    const crosses = a.sy > py !== b.sy > py;
    if (crosses && px < ((b.sx - a.sx) * (py - a.sy)) / (b.sy - a.sy) + a.sx) inside = !inside;
  }
  return inside;
}
