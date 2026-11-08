import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ModelAction, ValidatedAction } from "./types.js";

export type CatalogAsset = {
  id: string;
  copyKey: string;
  footprint: [number, number];
  anchor: [number, number];
  hit: number[][];
  depthKey: number;
  states: string[];
  reactions: { id: string; frames: number }[];
  svg: string;
  fill: string;
  accent: string;
  provenance: { method: string; date: string; thirdPartyReference: boolean };
};

export type Catalog = { version: string; assets: CatalogAsset[] };

export function loadCatalog(root = process.cwd()): Catalog {
  const catalog = JSON.parse(readFileSync(resolve(root, "assets/catalog/catalog.json"), "utf8")) as Catalog;
  for (const asset of catalog.assets) {
    if (!asset.provenance?.method || !asset.provenance.date || asset.provenance.thirdPartyReference !== false) {
      throw new Error(`missing provenance: ${asset.id}`);
    }
    if (!asset.svg || asset.hit.length < 3) throw new Error(`missing atlas frame: ${asset.id}`);
  }
  return catalog;
}

const RELATIONS = new Set(["next_to", "across_from", "near"]);

export function validateModelAction(value: unknown, catalog: Catalog): { ok: true; action: ModelAction } | { ok: false; reason: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "shape" };
  const row = value as Record<string, unknown>;
  if ("position" in row || "container_object_id" in row || "price" in row || "payment" in row) {
    return { ok: false, reason: "forbidden-field" };
  }
  const keys = Object.keys(row).sort().join(",");
  if (row.type === "PlaceObject") {
    if (keys !== "anchorId,assetId,relation,type") return { ok: false, reason: "shape" };
    const asset = catalog.assets.find((a) => a.id === row.assetId);
    if (!asset) return { ok: false, reason: "asset" };
    if (typeof row.anchorId !== "string" && row.anchorId !== null) return { ok: false, reason: "anchor" };
    if (!RELATIONS.has(String(row.relation))) return { ok: false, reason: "relation" };
    return {
      ok: true,
      action: {
        type: "PlaceObject",
        assetId: asset.id,
        anchorId: row.anchorId as string | null,
        relation: row.relation as "next_to" | "across_from" | "near",
      },
    };
  }
  if (row.type === "AttachRelation") {
    if (keys !== "fromId,relation,toId,type") return { ok: false, reason: "shape" };
    if (typeof row.fromId !== "string" || typeof row.toId !== "string") return { ok: false, reason: "ids" };
    if (!RELATIONS.has(String(row.relation))) return { ok: false, reason: "relation" };
    return { ok: true, action: row as unknown as ModelAction };
  }
  if (row.type === "SetNarrativeState") {
    if (keys !== "objectId,state,type") return { ok: false, reason: "shape" };
    if (typeof row.objectId !== "string" || typeof row.state !== "string") return { ok: false, reason: "shape" };
    return { ok: true, action: row as unknown as ModelAction };
  }
  return { ok: false, reason: "type" };
}

export function assertNoExtra(body: unknown, allowed: string[]): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  return Object.keys(body as object).every((key) => allowed.includes(key));
}

export function withPlacement(action: ModelAction, placement: { x: number; y: number }): ValidatedAction {
  if (action.type !== "PlaceObject") return action;
  return { ...action, placement };
}
