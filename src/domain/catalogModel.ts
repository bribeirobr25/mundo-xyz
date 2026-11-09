export type Motion = "none" | "hop" | "sway" | "glance" | "drift";

/** A named set of role colors. Geometry does not live here. */
export type Palette = { id: string; roles: Record<string, string> };

/**
 * One drawable layer of an asset.
 * The first layer is the static shell: `fit` scales it to the footprint.
 * Later layers reuse a frame file and a palette id. `fit` is their width as a fraction of the shell.
 */
export type CatalogLayer = {
  id: string;
  file: string;
  motion: Motion;
  tokens: string[];
  paletteId?: string;
  amplitude?: number;
  steps?: number;
  phase?: number;
  at?: [number, number];
  anchor?: [number, number];
  fit?: number;
};

export type CatalogAsset = {
  id: string;
  copyKey: string;
  footprint: [number, number];
  anchor: [number, number];
  hit: number[][];
  depthKey: number;
  states: string[];
  paletteId: string;
  layers: CatalogLayer[];
  provenance: { method: string; date: string; thirdPartyReference: boolean };
};

export type Catalog = {
  version: string;
  motionStepMs: number;
  ground: { paletteId: string };
  palettes: Palette[];
  assets: CatalogAsset[];
};

const HEX = /^#[0-9a-f]{6}$/;

export function paintSvg(template: string, roles: Record<string, string>): string {
  let painted = template;
  for (const [token, color] of Object.entries(roles)) {
    if (!HEX.test(color)) throw new Error("missing atlas frame");
    painted = painted.replaceAll(`{{${token}}}`, color);
  }
  if (painted.includes("{{")) throw new Error("missing atlas frame");
  return painted;
}

export function acceptedPalette(asset: CatalogAsset, paletteId: string, palettes: Palette[]): Palette | null {
  if (paletteId !== asset.paletteId) return null;
  return palettes.find((palette) => palette.id === paletteId) ?? null;
}

/** Hidden objects keep their cell, not their artwork, unless the viewer owns them. */
export function shownAsset(
  hidden: boolean,
  own: boolean,
  assetId: string,
  paletteId: string,
): { assetId: string | null; paletteId: string | null } {
  if (hidden && !own) return { assetId: null, paletteId: null };
  return { assetId, paletteId };
}
