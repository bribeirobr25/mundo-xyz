import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import type { Catalog, Motion, Palette } from "./catalogModel.js";

export type { Catalog, CatalogAsset, CatalogLayer, Motion, Palette } from "./catalogModel.js";
export { acceptedPalette, paintSvg, shownAsset } from "./catalogModel.js";

const MOTIONS = new Set<Motion>(["none", "hop", "sway"]);
const HEX = /^#[0-9a-f]{6}$/;
const GROUND_ROLES = ["field", "grass", "grassAlt", "pad", "path", "marker", "select"];
const REQUIRED_ASSETS = ["cafe_for_birds", "bus_stop"];

export type CatalogCheck = {
  copyKeys?: ReadonlySet<string>;
  digests?: readonly string[];
};

export function validateCatalog(catalog: Catalog, read: (file: string) => string, check: CatalogCheck = {}): void {
  if (!catalog || catalog.version !== "1") throw new Error("missing atlas frame");
  if (!Number.isFinite(catalog.motionStepMs) || catalog.motionStepMs < 200 || catalog.motionStepMs > 2000) {
    throw new Error("missing atlas frame");
  }
  const palettes = new Map<string, Palette>();
  for (const palette of catalog.palettes ?? []) {
    if (!palette.id || palettes.has(palette.id)) throw new Error("missing atlas frame");
    for (const color of Object.values(palette.roles ?? {})) {
      if (!HEX.test(color)) throw new Error(`missing atlas frame: ${palette.id}`);
    }
    palettes.set(palette.id, palette);
  }
  const ground = palettes.get(catalog.ground?.paletteId ?? "");
  if (!ground || GROUND_ROLES.some((role) => !ground.roles[role])) throw new Error("missing atlas frame: ground");
  const ids = new Set<string>();
  for (const asset of catalog.assets ?? []) {
    if (!asset.id || ids.has(asset.id)) throw new Error("missing atlas frame");
    ids.add(asset.id);
    if (!asset.copyKey || !asset.states?.length) throw new Error(`missing provenance: ${asset.id}`);
    if (check.copyKeys && !check.copyKeys.has(asset.copyKey)) throw new Error(`missing provenance: ${asset.id}`);
    if (!asset.provenance?.method || !asset.provenance.date || asset.provenance.thirdPartyReference !== false) {
      throw new Error(`missing provenance: ${asset.id}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asset.provenance.date)) throw new Error(`missing provenance: ${asset.id}`);
    if (!palettes.has(asset.paletteId)) throw new Error(`missing atlas frame: ${asset.id}`);
    if (asset.footprint[0] < 1 || asset.footprint[1] < 1 || asset.hit.length < 3) throw new Error(`missing atlas frame: ${asset.id}`);
    if (!asset.layers?.length) throw new Error(`missing atlas frame: ${asset.id}`);
    const layerIds = new Set<string>();
    asset.layers.forEach((layer, index) => {
      if (!layer.id || layerIds.has(layer.id)) throw new Error(`missing atlas frame: ${asset.id}`);
      layerIds.add(layer.id);
      if (!MOTIONS.has(layer.motion)) throw new Error(`missing atlas frame: ${asset.id}/${layer.id}`);
      if (!layer.file || layer.file.includes("..") || layer.file.startsWith("/") || layer.file.includes("\\")) {
        throw new Error(`missing atlas frame: ${asset.id}/${layer.id}`);
      }
      const palette = palettes.get(layer.paletteId ?? asset.paletteId);
      if (!palette) throw new Error(`missing atlas frame: ${asset.id}/${layer.id}`);
      const fit = layer.fit ?? (index === 0 ? 1 : 0.2);
      const [minFit, maxFit] = index === 0 ? [0.6, 2.5] : [0.05, 1];
      if (fit < minFit || fit > maxFit) throw new Error(`missing atlas frame: ${asset.id}/${layer.id}`);
      if (index === 0) {
        if (layer.motion !== "none" || !layer.anchor || layer.anchor.some((value) => value < 0 || value > 1)) {
          throw new Error(`missing atlas frame: ${asset.id}/${layer.id}`);
        }
      } else if (!layer.at || layer.at.some((value) => value < 0 || value > 1)) {
        throw new Error(`missing atlas frame: ${asset.id}/${layer.id}`);
      }
      if (layer.motion !== "none") {
        const amplitude = layer.amplitude ?? 0;
        const steps = layer.steps ?? 0;
        if (amplitude <= 0 || amplitude > 24 || steps < 2 || steps > 8) throw new Error(`missing atlas frame: ${asset.id}/${layer.id}`);
      }
      if (!layer.tokens?.length || layer.tokens.some((token) => !palette.roles[token])) {
        throw new Error(`missing atlas frame: ${asset.id}/${layer.id}`);
      }
      const svg = read(layer.file);
      const authored = svg.replaceAll("http://www.w3.org/2000/svg", "");
      if (/<script|https?:|url\s*\(|prototypes\/|<image|data:/i.test(authored)) {
        throw new Error(`missing atlas frame: ${asset.id}/${layer.id}`);
      }
      if (check.digests?.some((digest) => digest && svg.includes(digest))) {
        throw new Error(`missing atlas frame: ${asset.id}/${layer.id}`);
      }
      const found = new Set([...svg.matchAll(/\{\{([A-Za-z0-9]+)\}\}/g)].map((match) => match[1]));
      if (layer.tokens.some((token) => !found.has(token)) || [...found].some((token) => !layer.tokens.includes(token))) {
        throw new Error(`missing atlas frame: ${asset.id}/${layer.id}`);
      }
    });
  }
  for (const required of REQUIRED_ASSETS) {
    if (!ids.has(required)) throw new Error(`missing atlas frame: ${required}`);
  }
}

export function loadCatalog(root = process.cwd()): Catalog {
  const base = resolve(root, "assets/catalog");
  const catalog = JSON.parse(readFileSync(resolve(base, "catalog.json"), "utf8")) as Catalog;
  const copy = JSON.parse(readFileSync(resolve(root, "copy/en.json"), "utf8")) as Record<string, unknown>;
  const copyKeys = new Set(Object.keys(copy).filter((key) => typeof copy[key] === "string"));
  const manifest = JSON.parse(readFileSync(resolve(root, "docs/prototypes/manifest.json"), "utf8")) as {
    images?: { sha256?: string }[];
  };
  const digests = (manifest.images ?? []).flatMap((image) => (image.sha256 ? [image.sha256] : []));
  validateCatalog(catalog, (file) => {
    const full = resolve(base, file);
    const rel = relative(base, full);
    if (rel.startsWith("..") || rel.startsWith("/")) throw new Error("missing atlas frame");
    return readFileSync(full, "utf8");
  }, { copyKeys, digests });
  return catalog;
}
