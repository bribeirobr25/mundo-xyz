import type { AppConfig } from "../domain/config.js";
import type { Catalog } from "../domain/action.js";
import type { ModelAction, PortResult } from "../domain/types.js";

export type ProviderContext = {
  phrase: string;
  catalog: { id: string; name: string }[];
  selectedId: string | null;
  relationEnums: string[];
};

export function minimalContext(phrase: string, catalog: Catalog, names: Record<string, string>, selectedId: string | null): ProviderContext {
  return {
    phrase,
    catalog: catalog.assets.map((asset) => ({ id: asset.id, name: names[asset.copyKey] ?? asset.id })),
    selectedId,
    relationEnums: ["next_to", "across_from", "near"],
  };
}

export function buildProviderRequest(config: AppConfig, context: ProviderContext): Record<string, unknown> {
  return {
    model: config.interpreterModel,
    store: false,
    reasoning: { effort: "none" },
    input: [
      {
        role: "system",
        content:
          "Return one JSON action of type PlaceObject, AttachRelation, or SetNarrativeState. Do not include coordinates, prices, or interior fields.",
      },
      { role: "user", content: JSON.stringify(context) },
    ],
  };
}

export async function callProviderDouble(
  request: Record<string, unknown>,
  fetchImpl: typeof fetch,
  url: string,
): Promise<PortResult> {
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) return { kind: "providerFailed" };
  const body = (await response.json()) as { action?: unknown };
  if (!body.action || typeof body.action !== "object") return { kind: "invalidOutput", reason: "double" };
  return { kind: "supported", action: body.action as ModelAction, explanationKey: "template.placed" };
}
