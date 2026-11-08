export type Relation = "next_to" | "across_from" | "near";

export type Placement = { x: number; y: number };

export type PlaceAction = {
  type: "PlaceObject";
  assetId: string;
  anchorId: string | null;
  relation: Relation;
  placement: Placement;
};

export type AttachAction = {
  type: "AttachRelation";
  fromId: string;
  toId: string;
  relation: Relation;
};

export type NarrativeAction = {
  type: "SetNarrativeState";
  objectId: string;
  state: string;
};

export type ValidatedAction = PlaceAction | AttachAction | NarrativeAction;

export type ModelAction =
  | Omit<PlaceAction, "placement">
  | AttachAction
  | NarrativeAction;

export type PortResult =
  | { kind: "supported"; action: ModelAction; explanationKey: string }
  | { kind: "unsupported" }
  | { kind: "clarification" }
  | { kind: "no_change" }
  | { kind: "invalidOutput"; reason: string }
  | { kind: "providerFailed" };
