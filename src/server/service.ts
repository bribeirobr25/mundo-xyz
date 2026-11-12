import { randomUUID } from "node:crypto";
import type pg from "pg";
import { loadCatalog, shownAsset, validateModelAction, withPlacement, type Catalog, type CatalogAsset } from "../domain/action.js";
import { loadConfig, type AppConfig } from "../domain/config.js";
import { fingerprint } from "../domain/fingerprint.js";
import { normalizeInput } from "../domain/input.js";
import { place, type Occupant } from "../domain/placement.js";
import { checkPseudonym, publicName } from "../domain/pseudonym.js";
import type { ValidatedAction } from "../domain/types.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { reserveBudget, reconcileBudget } from "./budget.js";
import { groupedCode, keyedHash, networkKey, randomToken } from "./crypto.js";
import { DISTRICT_H, DISTRICT_W, districtRows } from "../domain/district.js";
import { fixtureInterpret } from "./fixture.js";
import { NEIGHBORHOOD, type SeedPlace } from "./neighborhood.js";

export type Copy = Record<string, string | string[]>;

export type Result = {
  status: number;
  body: Record<string, unknown>;
  cookies?: { name: string; value: string; maxAge?: number }[];
  clearCookies?: string[];
};

type ProposalRow = {
  id: string;
  capability_hash: string | null;
  author_id: string | null;
  private_text: string | null;
  action: ValidatedAction | null;
  base_revision: string | null;
  proposal_version: number;
  catalog_version: string;
  policy_version: string;
  confirm_key_hash: string | null;
  state: string;
  anchor_id: string | null;
  parent_contribution_id: string | null;
  placement_skip: number;
  interpret_seq: number;
  expires_at: Date | null;
};

export class WorldService {
  readonly networkSaltDay = new Date().toISOString().slice(0, 10);
  constructor(
    readonly pool: pg.Pool,
    readonly config: AppConfig,
    readonly catalog: Catalog,
    readonly copy: Copy,
    readonly policyText: string,
  ) {}

  static boot(pool: pg.Pool, overrides: Partial<AppConfig> = {}): WorldService {
    const config = loadConfig(overrides);
    const catalog = loadCatalog();
    const copy = JSON.parse(readFileSync(resolve("copy/en.json"), "utf8")) as Copy;
    const policy = JSON.parse(readFileSync(resolve("config/policy.json"), "utf8")) as { version: string; text: string };
    if (policy.version !== config.policyVersion) throw new Error("missing config: policyVersion");
    if (catalog.version !== config.catalogVersion) throw new Error("missing config: catalogVersion");
    return new WorldService(pool, config, catalog, copy, policy.text);
  }

  async seed(): Promise<void> {
    await this.ensureNeighborhood();
  }

  /** Adds prototype 00 scenery. Existing rows, including published contributions, stay. */
  private async ensureNeighborhood(): Promise<void> {
    const existing = await this.pool.query("SELECT id FROM world WHERE id = 1");
    let authorId: string;
    if (!existing.rowCount) {
      authorId = randomUUID();
      await this.pool.query("INSERT INTO world(id, placement_revision, feed_sequence) VALUES (1, 1, 0)");
      await this.pool.query(
        "INSERT INTO authors(id, pseudonym, skeleton, system) VALUES ($1, 'Administrator', 'administrator', true)",
        [authorId],
      );
      await this.pool.query("INSERT INTO author_roles(author_id, role) VALUES ($1, 'administrator')", [authorId]);
      await this.pool.query(
        "INSERT INTO role_events(id, author_id, role, action) VALUES ($1, $2, 'administrator', 'grant')",
        [randomUUID(), authorId],
      );
    } else {
      const author = await this.pool.query<{ id: string }>("SELECT id FROM authors WHERE system = true ORDER BY id LIMIT 1");
      authorId = author.rows[0]?.id ?? randomUUID();
      if (!author.rows[0]) {
        await this.pool.query(
          "INSERT INTO authors(id, pseudonym, skeleton, system) VALUES ($1, 'Administrator', 'administrator', true)",
          [authorId],
        );
        await this.pool.query("INSERT INTO author_roles(author_id, role) VALUES ($1, 'administrator')", [authorId]);
        await this.pool.query(
          "INSERT INTO role_events(id, author_id, role, action) VALUES ($1, $2, 'administrator', 'grant')",
          [randomUUID(), authorId],
        );
      }
    }
    const rows = await this.pool.query<{
      id: string;
      catalog_asset_id: string;
      x: number;
      y: number;
      footprint_w: number;
      footprint_h: number;
      approved_text: string | null;
      system: boolean;
    }>(
      `SELECT o.id, o.catalog_asset_id, o.x, o.y, o.footprint_w, o.footprint_h, c.approved_text, a.system
       FROM placed_objects o
       JOIN contributions c ON c.id = o.contribution_id
       JOIN authors a ON a.id = c.author_id`,
    );
    const occupied = rows.rows.map((row) => ({
      id: row.id,
      asset: row.catalog_asset_id,
      x: row.x,
      y: row.y,
      w: row.footprint_w,
      h: row.footprint_h,
      approved: row.approved_text,
      system: row.system,
    }));
    const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const free = (spot: SeedPlace, ignoreId: string | null) =>
      occupied.every((item) => item.id === ignoreId || !overlaps(item, spot));
    const cafe = NEIGHBORHOOD[0];
    const systemCafe = occupied.find((item) => item.system && item.asset === "cafe_for_birds" && item.approved == null);
    if (cafe && systemCafe) {
      if (free(cafe, systemCafe.id)) {
        await this.moveSeed(systemCafe.id, cafe);
        systemCafe.x = cafe.x;
        systemCafe.y = cafe.y;
        systemCafe.w = cafe.w;
        systemCafe.h = cafe.h;
        systemCafe.asset = cafe.asset;
      }
    } else if (cafe && free(cafe, null)) {
      await this.insertSeed(authorId, cafe);
      occupied.push({ id: cafe.id, asset: cafe.asset, x: cafe.x, y: cafe.y, w: cafe.w, h: cafe.h, approved: null, system: true });
    }
    for (const spot of NEIGHBORHOOD.slice(1)) {
      const found = occupied.find((item) => item.id === spot.id);
      if (found) {
        if (free(spot, found.id)) {
          await this.moveSeed(found.id, spot);
          found.x = spot.x;
          found.y = spot.y;
          found.w = spot.w;
          found.h = spot.h;
          found.asset = spot.asset;
        }
      } else if (free(spot, null)) {
        await this.insertSeed(authorId, spot);
        occupied.push({ id: spot.id, asset: spot.asset, x: spot.x, y: spot.y, w: spot.w, h: spot.h, approved: null, system: true });
      }
    }
  }

  private async insertSeed(authorId: string, spot: SeedPlace): Promise<void> {
    await this.pool.query(
      `INSERT INTO contributions(id, proposal_id, author_id, approved_text, visibility)
       VALUES ($1, NULL, $2, NULL, 'public')
       ON CONFLICT (id) DO NOTHING`,
      [spot.contributionId, authorId],
    );
    await this.pool.query(
      `INSERT INTO placed_objects(id, catalog_asset_id, catalog_version, x, y, footprint_w, footprint_h, state, contribution_id, relation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, NULL)
       ON CONFLICT (id) DO NOTHING`,
      [spot.id, spot.asset, this.config.catalogVersion, spot.x, spot.y, spot.w, spot.h, spot.contributionId],
    );
  }

  private async moveSeed(id: string, spot: SeedPlace): Promise<void> {
    await this.pool.query(
      `UPDATE placed_objects
       SET x = $2, y = $3, footprint_w = $4, footprint_h = $5, catalog_asset_id = $6, catalog_version = $7
       WHERE id = $1`,
      [id, spot.x, spot.y, spot.w, spot.h, spot.asset, this.config.catalogVersion],
    );
  }

  text(key: string, vars: Record<string, string> = {}): string {
    const raw = this.copy[key];
    if (typeof raw !== "string") return key;
    return raw.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? "");
  }

  async world(viewerId: string | null): Promise<Result> {
    await this.seed();
    const objects = await this.pool.query<{
      id: string;
      catalog_asset_id: string;
      x: number;
      y: number;
      footprint_w: number;
      footprint_h: number;
      hidden: boolean;
      contribution_id: string;
      relation: string | null;
      anchor_object_id: string | null;
      approved_text: string | null;
      author_id: string;
      system: boolean;
      pseudonym: string;
      visibility: string;
    }>(
      `SELECT o.id, o.catalog_asset_id, o.x, o.y, o.footprint_w, o.footprint_h, o.hidden, o.contribution_id,
              o.relation, o.anchor_object_id, c.approved_text, c.author_id, c.visibility, a.system, a.pseudonym
       FROM placed_objects o
       JOIN contributions c ON c.id = o.contribution_id
       JOIN authors a ON a.id = c.author_id
       ORDER BY o.y, o.x`,
    );
    const hiddenNames = await this.pool.query<{ author_id: string }>("SELECT author_id FROM pseudonym_hidden WHERE hidden");
    const hiddenAuthors = new Set(hiddenNames.rows.map((r) => r.author_id));
    const byId = new Map(objects.rows.map((row) => [row.id, row]));
    const publicObjects = objects.rows.map((row) => {
      const asset = this.catalog.assets.find((a) => a.id === row.catalog_asset_id);
      const anchor = row.anchor_object_id ? byId.get(row.anchor_object_id) : undefined;
      const anchorHidden = Boolean(anchor?.hidden);
      const own = viewerId === row.author_id;
      if (row.hidden && !own) {
        return {
          id: row.id,
          name: this.text("unavailablePlace"),
          hidden: true,
          x: row.x,
          y: row.y,
          w: row.footprint_w,
          h: row.footprint_h,
          ...shownAsset(true, false, row.catalog_asset_id, asset?.paletteId ?? ""),
        };
      }
      const authorLabel = row.system
        ? this.text("administrator")
        : publicName(row.pseudonym, row.author_id, hiddenAuthors.has(row.author_id) && !own);
      const base = asset ? this.text(asset.copyKey) : row.catalog_asset_id;
      const name = !row.hidden && row.approved_text ? `${base} — ${row.approved_text}` : base;
      const anchorName = !anchor ? this.text("relation.none") : anchor.hidden ? this.text("unavailablePlace") : this.objectBaseName(anchor.catalog_asset_id, anchor.approved_text, anchor.hidden);
      return {
        id: row.id,
        contributionId: row.contribution_id,
        name: row.hidden ? this.text("unavailablePlace") : name,
        authorLabel,
        administrator: row.system,
        sentence: row.hidden && !own ? null : row.approved_text,
        hidden: row.hidden,
        notPublic: row.hidden,
        x: row.x,
        y: row.y,
        w: row.footprint_w,
        h: row.footprint_h,
        ...shownAsset(row.hidden, own, row.catalog_asset_id, asset?.paletteId ?? ""),
        relation: row.relation,
        anchorHidden,
        history: row.system
          ? row.catalog_asset_id === "cafe_for_birds"
            ? this.text("template.seed")
            : this.text("template.neighborhood", { asset: base })
          : this.text("template.placed", {
              name: authorLabel,
              asset: base,
              relation: this.text(`relation.${row.relation ?? "none"}`),
              anchor: anchorName,
            }),
      };
    });
    const home = objects.rows.find((row) => row.system && row.catalog_asset_id === "cafe_for_birds")
      ?? objects.rows.find((row) => row.system)
      ?? objects.rows[0];
    const hour = new Date().getUTCHours();
    const phase = hour >= this.config.dayStartHourUtc && hour < this.config.nightStartHourUtc ? "day" : "night";
    let returnNote: Record<string, unknown> | null = null;
    if (viewerId) {
      const news = await this.pool.query<{
        id: string;
        approved_text: string | null;
        author_id: string;
        pseudonym: string;
        system: boolean;
        catalog_asset_id: string | null;
        object_id: string | null;
        parent_asset: string | null;
        parent_text: string | null;
        parent_hidden: boolean | null;
      }>(
        `SELECT child.id, child.approved_text, child.author_id, author.pseudonym, author.system,
                child_object.catalog_asset_id, child_object.id AS object_id,
                parent_object.catalog_asset_id AS parent_asset, parent.approved_text AS parent_text, parent_object.hidden AS parent_hidden
         FROM contributions child
         JOIN contributions parent ON parent.id = child.parent_contribution_id
         JOIN authors author ON author.id = child.author_id
         LEFT JOIN placed_objects child_object ON child_object.contribution_id = child.id
         LEFT JOIN placed_objects parent_object ON parent_object.contribution_id = parent.id
         WHERE parent.author_id = $1 AND child.author_id <> $1 AND child.visibility = 'public'
           AND child.created_at > COALESCE((SELECT seen_at FROM author_cursors WHERE author_id = $1), parent.created_at)
         ORDER BY child.created_at ASC LIMIT 1`,
        [viewerId],
      );
      const item = news.rows[0];
      if (item) {
        const creation = item.parent_hidden
          ? this.text("unavailablePlace")
          : this.objectBaseName(item.parent_asset ?? "", item.parent_text, false);
        const who = item.system ? this.text("administrator") : publicName(item.pseudonym, item.author_id, hiddenAuthors.has(item.author_id));
        returnNote = {
          contributionId: item.id,
          objectId: item.object_id,
          text: this.text("sinceLast", { name: who, creation }),
          added: this.text("added", { what: item.approved_text ?? this.objectBaseName(item.catalog_asset_id ?? "", null, false) }),
        };
      }
    }
    return {
      status: 200,
      body: {
        objects: publicObjects,
        homeId: home?.id ?? null,
        district: { w: DISTRICT_W, h: DISTRICT_H, rows: districtRows() },
        phase,
        weather: this.config.weather,
        pollIntervalMs: this.config.pollIntervalMs,
        returnNote,
        policy: this.policyText,
        publishingOpen: this.config.publishAccess !== null,
      },
    };
  }

  private catalogPreview(asset: CatalogAsset, cell: { x: number; y: number }, sentence: string | null): Record<string, unknown> {
    const assetName = this.text(asset.copyKey);
    return {
      name: sentence ? `${assetName} — ${sentence}` : assetName,
      x: cell.x,
      y: cell.y,
      w: asset.footprint[0],
      h: asset.footprint[1],
      assetId: asset.id,
      paletteId: asset.paletteId,
      explanation: this.text("understood"),
    };
  }

  private objectBaseName(assetId: string, sentence: string | null, hidden: boolean): string {
    if (hidden) return this.text("unavailablePlace");
    const asset = this.catalog.assets.find((a) => a.id === assetId);
    const base = asset ? this.text(asset.copyKey) : assetId;
    return sentence ? `${base} — ${sentence}` : base;
  }

  async ensureCapability(existing: string | null): Promise<{ token: string; hash: string; fresh: boolean }> {
    if (existing) return { token: existing, hash: keyedHash(this.config.pepper, existing), fresh: false };
    const token = randomToken();
    return { token, hash: keyedHash(this.config.pepper, token), fresh: true };
  }

  async interpret(input: {
    text: string;
    anchorId: string | null;
    capability: string | null;
    networkAddress: string;
  }): Promise<Result> {
    const cap = await this.ensureCapability(input.capability);
    const normalized = normalizeInput(input.text, this.config);
    if (!normalized.ok) {
      return { status: 400, body: { code: normalized.code, draftKept: true }, cookies: cap.fresh ? [this.capCookie(cap.token)] : undefined };
    }
    const allowed = await this.bumpCaps(cap.hash, input.networkAddress);
    if (!allowed.ok) {
      return { status: allowed.status, body: { code: allowed.code, draftKept: true }, cookies: cap.fresh ? [this.capCookie(cap.token)] : undefined };
    }
    if (this.config.runMode === "production") {
      return { status: 503, body: { code: "preview_unavailable", draftKept: true } };
    }
    const open = await this.pool.query<{ id: string; interpret_seq: number }>(
      `SELECT id, interpret_seq FROM proposals
       WHERE capability_hash = $1 AND author_id IS NULL AND state IN ('draft','ready','confirming')
       ORDER BY created_at DESC LIMIT 1`,
      [cap.hash],
    );
    const seq = (open.rows[0]?.interpret_seq ?? 0) + 1;
    const id = open.rows[0]?.id ?? randomUUID();
    if (!open.rows[0]) {
      await this.pool.query(
        `INSERT INTO proposals(id, capability_hash, state, catalog_version, policy_version, interpret_seq, private_text, anchor_id)
         VALUES ($1,$2,'draft',$3,$4,$5,$6,$7)`,
        [id, cap.hash, this.config.catalogVersion, this.config.policyVersion, seq, normalized.text, input.anchorId],
      );
    } else {
      await this.pool.query(
        `UPDATE proposals SET interpret_seq = $2, private_text = $3, anchor_id = $4, state = 'draft', confirm_key_hash = NULL
         WHERE id = $1 AND interpret_seq = $5`,
        [id, seq, normalized.text, input.anchorId, seq - 1],
      );
    }
    const interpreted = fixtureInterpret(normalized.text, input.anchorId);
    if (interpreted.kind !== "supported") {
      const code = interpreted.kind === "invalidOutput" ? "invalid_output" : interpreted.kind === "providerFailed" ? "provider_failed" : interpreted.kind;
      await this.pool.query("UPDATE proposals SET state = 'draft' WHERE id = $1 AND interpret_seq = $2", [id, seq]);
      return {
        status: interpreted.kind === "unsupported" || interpreted.kind === "clarification" || interpreted.kind === "no_change" ? 200 : 422,
        body: { code, proposalId: id, draftKept: true, publicWrites: 0 },
        cookies: cap.fresh ? [this.capCookie(cap.token)] : undefined,
      };
    }
    const validated = validateModelAction(interpreted.action, this.catalog);
    if (!validated.ok || validated.action.type !== "PlaceObject") {
      return { status: 422, body: { code: "invalid_output", proposalId: id, draftKept: true }, cookies: cap.fresh ? [this.capCookie(cap.token)] : undefined };
    }
    const occupants = await this.occupants();
    const anchor = input.anchorId ? await this.anchorCell(input.anchorId) : null;
    if (input.anchorId && !anchor) {
      return { status: 409, body: { code: "unavailable", proposalId: id, draftKept: true }, cookies: cap.fresh ? [this.capCookie(cap.token)] : undefined };
    }
    const model = validated.action;
    const asset = model.type === "PlaceObject" ? this.catalog.assets.find((a) => a.id === model.assetId) : undefined;
    const placed = asset && model.type === "PlaceObject" ? place(asset, anchor, model.relation, occupants, this.config.bounds, 0) : null;
    if (!asset || !placed || model.type !== "PlaceObject") {
      return { status: 200, body: { code: "unsupported", proposalId: id, draftKept: true }, cookies: cap.fresh ? [this.capCookie(cap.token)] : undefined };
    }
    const action = withPlacement(model, placed);
    const revision = await this.pool.query<{ placement_revision: string }>("SELECT placement_revision FROM world WHERE id = 1");
    const parent = input.anchorId
      ? await this.pool.query<{ contribution_id: string }>("SELECT contribution_id FROM placed_objects WHERE id = $1", [input.anchorId])
      : { rows: [] as { contribution_id: string }[] };
    const updated = await this.pool.query(
      `UPDATE proposals SET state = 'ready', action = $2, base_revision = $3, private_text = $4, parent_contribution_id = $5,
         placement_skip = 0, expires_at = now() + ($6 || ' hours')::interval
       WHERE id = $1 AND interpret_seq = $7`,
      [id, JSON.stringify(action), revision.rows[0]?.placement_revision ?? 1, normalized.text, parent.rows[0]?.contribution_id ?? null, this.config.proposalTtlHours, seq],
    );
    if (!updated.rowCount) {
      return { status: 200, body: { code: "superseded", proposalId: id, draftKept: true }, cookies: cap.fresh ? [this.capCookie(cap.token)] : undefined };
    }
    return {
      status: 200,
      body: {
        code: "ready",
        proposalId: id,
        proposalVersion: 1,
        preview: this.catalogPreview(asset, placed, normalized.text),
        interpreter: "fixture",
        publicWrites: 0,
      },
      cookies: cap.fresh ? [this.capCookie(cap.token)] : undefined,
    };
  }

  async anotherSpot(proposalId: string, capability: string | null, authorId: string | null): Promise<Result> {
    const proposal = await this.loadReadable(proposalId, capability, authorId);
    if (!proposal || !proposal.action || proposal.action.type !== "PlaceObject") return notFound();
    if (proposal.state !== "draft" && proposal.state !== "ready") {
      return { status: 409, body: { code: "conflict", draftKept: true } };
    }
    const stored = proposal.action;
    const asset = stored?.type === "PlaceObject" ? this.catalog.assets.find((a) => a.id === stored.assetId) : undefined;
    if (!stored || stored.type !== "PlaceObject" || !asset) return notFound();
    const skip = proposal.placement_skip + 1;
    const occupants = await this.occupants();
    const anchor = proposal.anchor_id ? await this.anchorCell(proposal.anchor_id) : null;
    const placed = place(asset, anchor, stored.relation, occupants, this.config.bounds, skip);
    if (!placed) return { status: 409, body: { code: "unavailable", draftKept: true } };
    const action = { ...stored, placement: placed };
    await this.pool.query(
      "UPDATE proposals SET action = $2, placement_skip = $3, proposal_version = proposal_version + 1, confirm_key_hash = NULL WHERE id = $1",
      [proposalId, JSON.stringify(action), skip],
    );
    return { status: 200, body: { code: "ready", proposalId, preview: this.catalogPreview(asset, placed, proposal.private_text) } };
  }

  async discard(proposalId: string, capability: string | null, authorId: string | null): Promise<Result> {
    const proposal = await this.loadReadable(proposalId, capability, authorId);
    if (!proposal) return notFound();
    await this.pool.query("UPDATE proposals SET state = 'discarded', private_text = NULL, action = NULL, confirm_key_hash = NULL WHERE id = $1", [proposalId]);
    return { status: 200, body: { code: "discarded" } };
  }

  async confirm(input: {
    proposalId: string;
    capability: string | null;
    authorId: string | null;
    idempotencyKey: string;
  }): Promise<Result> {
    if (!input.authorId) return { status: 401, body: { code: "needs_identity", draftKept: true } };
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM world WHERE id = 1 FOR UPDATE");
      const proposal = await this.lockProposal(client, input.proposalId, input.capability, input.authorId);
      if (!proposal) {
        await client.query("ROLLBACK");
        return notFound();
      }
      if (proposal.state === "applied") {
        const existing = await client.query<{ id: string }>("SELECT id FROM contributions WHERE proposal_id = $1", [proposal.id]);
        await client.query("COMMIT");
        return { status: 200, body: { code: "already_published", contributionId: existing.rows[0]?.id ?? null } };
      }
      if (proposal.state === "discarded") {
        await client.query("ROLLBACK");
        return notFound();
      }
      if (proposal.state === "expired" || (proposal.expires_at && proposal.expires_at.getTime() < Date.now())) {
        await client.query("UPDATE proposals SET state = 'expired' WHERE id = $1", [proposal.id]);
        await client.query("COMMIT");
        return { status: 409, body: { code: "expired", draftKept: true } };
      }
      const prior = await client.query<{ fingerprint: string; response: Record<string, unknown> }>(
        "SELECT fingerprint, response FROM idempotency WHERE author_id = $1 AND key = $2",
        [input.authorId, input.idempotencyKey],
      );
      if (prior.rows[0]) {
        await client.query("COMMIT");
        return { status: 200, body: prior.rows[0].response };
      }
      if (!proposal.author_id) {
        await client.query("UPDATE proposals SET author_id = $2 WHERE id = $1", [proposal.id, input.authorId]);
        proposal.author_id = input.authorId;
      }
      const world = await client.query<{ placement_revision: string }>("SELECT placement_revision FROM world WHERE id = 1");
      if (!proposal.action || proposal.base_revision !== world.rows[0]?.placement_revision) {
        const refreshed = await this.refreshLocked(client, proposal);
        await client.query("COMMIT");
        return refreshed;
      }
      const key = randomToken();
      const response = { code: "confirming", proposalId: proposal.id, proposalVersion: proposal.proposal_version, confirmKey: key };
      await client.query("UPDATE proposals SET state = 'confirming', confirm_key_hash = $2 WHERE id = $1", [proposal.id, keyedHash(this.config.pepper, key)]);
      await client.query(
        "INSERT INTO idempotency(author_id, key, fingerprint, request, response) VALUES ($1,$2,$3,$4,$5)",
        [input.authorId, input.idempotencyKey, keyedHash(this.config.pepper, input.idempotencyKey), JSON.stringify({ kind: "confirm" }), JSON.stringify(response)],
      );
      await client.query("COMMIT");
      return { status: 200, body: response };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async publish(input: {
    proposalId: string;
    proposalVersion: number;
    key: string;
    capability: string | null;
    authorId: string | null;
  }): Promise<Result> {
    if (this.config.publishAccess === null) return { status: 403, body: { code: "publishing_closed", message: this.text("publishingClosed"), draftKept: true } };
    if (!input.authorId) return { status: 401, body: { code: "unauthorized", draftKept: true } };
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT id FROM world WHERE id = 1 FOR UPDATE");
      const proposal = await this.lockProposal(client, input.proposalId, input.capability, input.authorId);
      if (!proposal || !proposal.action || !proposal.author_id) {
        await client.query("ROLLBACK");
        return notFound();
      }
      const requestSnapshot = {
        proposalId: proposal.id,
        proposalVersion: input.proposalVersion,
        action: proposal.proposal_version === input.proposalVersion ? proposal.action : { mismatch: true },
        authorId: proposal.author_id,
        catalogVersion: proposal.catalog_version,
        policyVersion: proposal.policy_version,
      };
      const fp = fingerprint(requestSnapshot as Parameters<typeof fingerprint>[0]);
      const existing = await client.query<{ fingerprint: string; request: { proposalVersion: number; action: ValidatedAction }; response: Record<string, unknown> }>(
        "SELECT fingerprint, request, response FROM idempotency WHERE author_id = $1 AND key = $2",
        [proposal.author_id, input.key],
      );
      if (existing.rows[0]) {
        const snap = existing.rows[0].request;
        const retryFp = fingerprint({
          proposalId: proposal.id,
          proposalVersion: input.proposalVersion,
          action: snap.action,
          authorId: proposal.author_id,
          catalogVersion: proposal.catalog_version,
          policyVersion: proposal.policy_version,
        });
        await client.query(retryFp === existing.rows[0].fingerprint ? "COMMIT" : "ROLLBACK");
        if (retryFp !== existing.rows[0].fingerprint) return { status: 422, body: { code: "fingerprint_mismatch" } };
        const stored = existing.rows[0].response;
        if (stored.code === "published") return { status: 200, body: { ...stored, code: "already_published" } };
        return { status: 200, body: stored };
      }
      if (proposal.state === "applied") {
        const row = await client.query<{ id: string }>("SELECT id FROM contributions WHERE proposal_id = $1", [proposal.id]);
        await client.query("COMMIT");
        return { status: 200, body: { code: "already_published", contributionId: row.rows[0]?.id } };
      }
      if (proposal.expires_at && proposal.expires_at.getTime() < Date.now()) {
        await client.query("UPDATE proposals SET state = 'expired' WHERE id = $1", [proposal.id]);
        await client.query("COMMIT");
        return { status: 409, body: { code: "expired", draftKept: true } };
      }
      const blocked = await client.query("SELECT 1 FROM author_blocks WHERE author_id = $1 AND blocked", [proposal.author_id]);
      if (blocked.rowCount) {
        await client.query("ROLLBACK");
        return { status: 403, body: { code: "publishing_blocked", draftKept: true } };
      }
      if (this.config.publishAccess === "invite") {
        const grant = await client.query("SELECT 1 FROM publish_grants WHERE author_id = $1 AND revoked_at IS NULL", [proposal.author_id]);
        if (!grant.rowCount) {
          await client.query("ROLLBACK");
          return { status: 403, body: { code: "invite_required", draftKept: true } };
        }
      }
      const world = await client.query<{ placement_revision: string }>("SELECT placement_revision FROM world WHERE id = 1");
      const keyOk = proposal.confirm_key_hash === keyedHash(this.config.pepper, input.key);
      if (!keyOk || proposal.proposal_version !== input.proposalVersion) {
        await client.query("ROLLBACK");
        return { status: 422, body: { code: "fingerprint_mismatch" } };
      }
      if (proposal.base_revision !== world.rows[0]?.placement_revision) {
        const refreshed = await this.refreshLocked(client, proposal);
        const storedFp = fingerprint({
          proposalId: proposal.id,
          proposalVersion: input.proposalVersion,
          action: proposal.action,
          authorId: proposal.author_id,
          catalogVersion: proposal.catalog_version,
          policyVersion: proposal.policy_version,
        });
        await client.query(
          "INSERT INTO idempotency(author_id, key, fingerprint, request, response) VALUES ($1,$2,$3,$4,$5)",
          [proposal.author_id, input.key, storedFp, JSON.stringify({ proposalVersion: input.proposalVersion, action: proposal.action }), JSON.stringify(refreshed.body)],
        );
        await client.query("COMMIT");
        return refreshed;
      }
      const day = await client.query<{ n: string }>(
        "SELECT count(*)::text AS n FROM contributions WHERE author_id = $1 AND created_at::date = now()::date",
        [proposal.author_id],
      );
      if (Number(day.rows[0]?.n ?? 0) >= this.config.publishPerAuthorPerDay) {
        await client.query("ROLLBACK");
        return { status: 429, body: { code: "rate_limited", draftKept: true } };
      }
      const contributionId = randomUUID();
      const inserted = await client.query(
        `INSERT INTO contributions(id, proposal_id, author_id, parent_contribution_id, approved_text, anchor_object_id, visibility)
         VALUES ($1,$2,$3,$4,$5,$6,'public') RETURNING id`,
        [contributionId, proposal.id, proposal.author_id, proposal.parent_contribution_id, proposal.private_text, proposal.anchor_id],
      );
      if (proposal.action.type === "PlaceObject") {
        const publishing = proposal.action;
        const asset = publishing.type === "PlaceObject" ? this.catalog.assets.find((a) => a.id === publishing.assetId) : undefined;
        if (!asset || publishing.type !== "PlaceObject") {
          await client.query("ROLLBACK");
          return { status: 409, body: { code: "unavailable", draftKept: true } };
        }
        const objectId = randomUUID();
        await client.query(
          `INSERT INTO placed_objects(id, catalog_asset_id, catalog_version, x, y, footprint_w, footprint_h, state, contribution_id, relation, anchor_object_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'open',$8,$9,$10)`,
          [
            objectId,
            publishing.assetId,
            this.config.catalogVersion,
            publishing.placement.x,
            publishing.placement.y,
            asset.footprint[0],
            asset.footprint[1],
            inserted.rows[0]?.id,
            publishing.relation,
            publishing.anchorId,
          ],
        );
      }
      await client.query(
        "UPDATE proposals SET state = 'applied', private_text = NULL, confirm_key_hash = NULL WHERE id = $1",
        [proposal.id],
      );
      await client.query("UPDATE world SET placement_revision = placement_revision + 1 WHERE id = 1");
      const body = { code: "published", contributionId, proposalId: proposal.id };
      await client.query(
        "INSERT INTO idempotency(author_id, key, fingerprint, request, response) VALUES ($1,$2,$3,$4,$5)",
        [proposal.author_id, input.key, fp, JSON.stringify({ proposalVersion: input.proposalVersion, action: proposal.action }), JSON.stringify(body)],
      );
      await client.query("COMMIT");
      return { status: 200, body };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async refreshLocked(client: pg.PoolClient, proposal: ProposalRow): Promise<Result> {
    if (!proposal.action || proposal.action.type !== "PlaceObject") {
      return { status: 409, body: { code: "unavailable", draftKept: true } };
    }
    const refreshing = proposal.action;
    const asset = refreshing.type === "PlaceObject" ? this.catalog.assets.find((a) => a.id === refreshing.assetId) : undefined;
    if (!asset || refreshing.type !== "PlaceObject") return { status: 409, body: { code: "unavailable", draftKept: true } };
    const occupants = await this.occupants(client);
    const anchor = refreshing.anchorId ? await this.anchorCell(refreshing.anchorId, client) : null;
    if (refreshing.anchorId && !anchor) return { status: 409, body: { code: "unavailable", draftKept: true } };
    const placed = place(asset, anchor, refreshing.relation, occupants, this.config.bounds, 0);
    if (!placed) return { status: 409, body: { code: "unavailable", draftKept: true } };
    const action = { ...refreshing, placement: placed };
    const world = await client.query<{ placement_revision: string }>("SELECT placement_revision FROM world WHERE id = 1");
    const version = proposal.proposal_version + 1;
    await client.query(
      `UPDATE proposals SET action = $2, base_revision = $3, proposal_version = $4, state = 'ready', confirm_key_hash = NULL
       WHERE id = $1`,
      [proposal.id, JSON.stringify(action), world.rows[0]?.placement_revision, version],
    );
    return {
      status: 409,
      body: {
        code: "conflict",
        proposalId: proposal.id,
        proposalVersion: version,
        preview: this.catalogPreview(asset, placed, proposal.private_text),
        providerCalls: 0,
      },
    };
  }

  async createIdentity(input: { pseudonym: string; acknowledge: boolean; capability: string | null; extra: Record<string, unknown> }): Promise<Result> {
    const forbidden = ["email", "phone", "social", "location"].filter((key) => key in input.extra);
    if (forbidden.length) return { status: 400, body: { code: "forbidden_field", fields: forbidden } };
    if (!input.acknowledge) return { status: 400, body: { code: "acknowledgement_required" } };
    const checked = checkPseudonym(input.pseudonym);
    if (!checked.ok) return { status: 400, body: { code: "pseudonym" } };
    const authorId = randomUUID();
    const session = randomToken();
    const recovery = groupedCode();
    const next = randomToken();
    try {
      await this.pool.query("INSERT INTO authors(id, pseudonym, skeleton) VALUES ($1,$2,$3)", [authorId, checked.display, checked.skeleton]);
    } catch {
      return { status: 409, body: { code: "pseudonym_taken" } };
    }
    await this.pool.query("INSERT INTO sessions(id, author_id, secret_hash, expires_at) VALUES ($1,$2,$3, now() + ($4 || ' days')::interval)", [
      randomUUID(),
      authorId,
      keyedHash(this.config.pepper, session),
      this.config.sessionMaxAgeDays,
    ]);
    await this.pool.query("INSERT INTO recovery_codes(id, author_id, code_hash) VALUES ($1,$2,$3)", [randomUUID(), authorId, keyedHash(this.config.pepper, recovery)]);
    if (input.capability) {
      await this.pool.query(
        "UPDATE proposals SET capability_hash = $2 WHERE capability_hash = $1 AND author_id IS NULL",
        [keyedHash(this.config.pepper, input.capability), keyedHash(this.config.pepper, next)],
      );
    }
    return {
      status: 201,
      body: {
        authorId,
        pseudonym: publicName(checked.display, authorId, false),
        recoveryCode: recovery,
        warning: this.text("recoveryWarning"),
      },
      cookies: [this.sessionCookie(session), this.capCookie(next)],
    };
  }

  async recover(input: { code: string; networkAddress: string }): Promise<Result> {
    const net = networkKey(this.config.pepper, input.networkAddress, this.networkSaltDay);
    const allowed = await this.bump(`recover:${net}`, this.config.recoveryAttemptsPerNetworkKeyPerHour, 3600);
    if (!allowed) return { status: 429, body: { code: "rate_limited" } };
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const row = await client.query<{ id: string; author_id: string; used_at: Date | null }>(
        "SELECT id, author_id, used_at FROM recovery_codes WHERE code_hash = $1 FOR UPDATE",
        [keyedHash(this.config.pepper, input.code)],
      );
      const code = row.rows[0];
      const author = code
        ? await client.query<{ disabled: boolean }>("SELECT disabled FROM authors WHERE id = $1", [code.author_id])
        : { rows: [] as { disabled: boolean }[] };
      if (!code || code.used_at || author.rows[0]?.disabled) {
        await client.query("ROLLBACK");
        return { status: 400, body: { code: "recovery_refused" } };
      }
      await client.query("UPDATE recovery_codes SET used_at = now() WHERE id = $1", [code.id]);
      await client.query("UPDATE sessions SET revoked_at = now() WHERE author_id = $1 AND revoked_at IS NULL", [code.author_id]);
      const session = randomToken();
      const replacement = groupedCode();
      await client.query("INSERT INTO sessions(id, author_id, secret_hash, expires_at) VALUES ($1,$2,$3, now() + ($4 || ' days')::interval)", [
        randomUUID(),
        code.author_id,
        keyedHash(this.config.pepper, session),
        this.config.sessionMaxAgeDays,
      ]);
      await client.query("INSERT INTO recovery_codes(id, author_id, code_hash) VALUES ($1,$2,$3)", [randomUUID(), code.author_id, keyedHash(this.config.pepper, replacement)]);
      await client.query("COMMIT");
      return { status: 200, body: { authorId: code.author_id, recoveryCode: replacement }, cookies: [this.sessionCookie(session)], clearCookies: ["__Host-sw_cap"] };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async signOut(sessionToken: string | null): Promise<Result> {
    if (sessionToken) {
      await this.pool.query("UPDATE sessions SET revoked_at = now() WHERE secret_hash = $1", [keyedHash(this.config.pepper, sessionToken)]);
    }
    return { status: 200, body: { code: "signed_out" }, clearCookies: ["__Host-sw_session", "__Host-sw_cap"] };
  }

  async redeemInvite(input: { code: string; authorId: string | null; networkAddress: string }): Promise<Result> {
    if (!input.authorId) return { status: 401, body: { code: "needs_identity" } };
    const net = networkKey(this.config.pepper, input.networkAddress, this.networkSaltDay);
    const allowed = await this.bump(`invite:${net}`, this.config.inviteRedeemAttemptsPerNetworkKeyPerHour, 3600);
    if (!allowed) return { status: 429, body: { code: "rate_limited" } };
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const invite = await client.query<{ id: string; expires_at: Date; max_redemptions: number; redemption_count: number; revoked_at: Date | null }>(
        "SELECT id, expires_at, max_redemptions, redemption_count, revoked_at FROM invites WHERE code_hash = $1 FOR UPDATE",
        [keyedHash(this.config.pepper, input.code)],
      );
      const row = invite.rows[0];
      const already = await client.query<{ invite_id: string }>("SELECT invite_id FROM publish_grants WHERE author_id = $1 AND revoked_at IS NULL", [input.authorId]);
      if (already.rows[0]) {
        await client.query("COMMIT");
        return { status: 200, body: { code: "grant", inviteId: already.rows[0].invite_id, consumed: false } };
      }
      if (!row || row.revoked_at || row.expires_at.getTime() < Date.now() || row.redemption_count >= row.max_redemptions) {
        await client.query("ROLLBACK");
        return { status: 400, body: { code: "invite_refused" } };
      }
      await client.query("INSERT INTO publish_grants(author_id, invite_id) VALUES ($1,$2)", [input.authorId, row.id]);
      await client.query("UPDATE invites SET redemption_count = redemption_count + 1 WHERE id = $1", [row.id]);
      await client.query("COMMIT");
      return { status: 200, body: { code: "grant", inviteId: row.id, consumed: true } };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async grantAdmin(authorId: string): Promise<void> {
    await this.pool.query("INSERT INTO author_roles(author_id, role) VALUES ($1, 'administrator') ON CONFLICT (author_id) DO UPDATE SET role = 'administrator'", [authorId]);
    await this.pool.query("INSERT INTO role_events(id, author_id, role, action) VALUES ($1,$2,'administrator','grant')", [randomUUID(), authorId]);
  }

  async mintInvite(actorId: string | null, maxRedemptions = this.config.inviteDefaultMaxRedemptions): Promise<Result> {
    if (!(await this.isAdmin(actorId))) return notFound();
    const code = groupedCode();
    await this.pool.query(
      `INSERT INTO invites(id, code_hash, created_by, expires_at, max_redemptions)
       VALUES ($1,$2,$3, now() + ($4 || ' days')::interval, $5)`,
      [randomUUID(), keyedHash(this.config.pepper, code), actorId, this.config.inviteDefaultExpiryDays, maxRedemptions],
    );
    return { status: 201, body: { code, expiresInDays: this.config.inviteDefaultExpiryDays, maxRedemptions } };
  }

  async revokeInvite(actorId: string | null, code: string): Promise<Result> {
    if (!(await this.isAdmin(actorId))) return notFound();
    const updated = await this.pool.query("UPDATE invites SET revoked_at = now() WHERE code_hash = $1 AND revoked_at IS NULL", [keyedHash(this.config.pepper, code)]);
    if (!updated.rowCount) return notFound();
    return { status: 200, body: { code: "revoked" } };
  }

  async hide(actorId: string | null, contributionId: string): Promise<Result> {
    if (!(await this.isAdmin(actorId))) return notFound();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const seq = await client.query<{ feed_sequence: string }>("UPDATE world SET feed_sequence = feed_sequence + 1 WHERE id = 1 RETURNING feed_sequence");
      await client.query("UPDATE contributions SET visibility = 'hidden' WHERE id = $1", [contributionId]);
      await client.query("UPDATE placed_objects SET hidden = true WHERE contribution_id = $1", [contributionId]);
      await client.query(
        "INSERT INTO moderation_decisions(id, feed_sequence, target_type, target_id, action, actor_id) VALUES ($1,$2,'contribution',$3,'hide',$4)",
        [randomUUID(), seq.rows[0]?.feed_sequence, contributionId, actorId],
      );
      await client.query("COMMIT");
      return { status: 200, body: { code: "hidden", feedSequence: Number(seq.rows[0]?.feed_sequence ?? 0) } };
    } finally {
      client.release();
    }
  }

  async blockAuthor(actorId: string | null, targetId: string): Promise<Result> {
    if (!(await this.isAdmin(actorId))) return notFound();
    await this.pool.query(
      "INSERT INTO author_blocks(author_id, blocked) VALUES ($1, true) ON CONFLICT (author_id) DO UPDATE SET blocked = true",
      [targetId],
    );
    await this.pool.query("UPDATE publish_grants SET revoked_at = now() WHERE author_id = $1 AND revoked_at IS NULL", [targetId]);
    const seq = await this.pool.query<{ feed_sequence: string }>("UPDATE world SET feed_sequence = feed_sequence + 1 WHERE id = 1 RETURNING feed_sequence");
    await this.pool.query(
      "INSERT INTO moderation_decisions(id, feed_sequence, target_type, target_id, action, actor_id) VALUES ($1,$2,'author',$3,'block',$4)",
      [randomUUID(), seq.rows[0]?.feed_sequence, targetId, actorId],
    );
    return { status: 200, body: { code: "blocked" } };
  }

  async dependents(actorId: string | null, contributionId: string): Promise<Result> {
    if (!(await this.isAdmin(actorId))) return notFound();
    const rows = await this.pool.query<{ id: string }>(
      `SELECT c.id FROM contributions c
       LEFT JOIN placed_objects o ON o.contribution_id = c.id
       WHERE c.parent_contribution_id = $1 OR o.anchor_object_id IN (SELECT id FROM placed_objects WHERE contribution_id = $1)`,
      [contributionId],
    );
    return { status: 200, body: { dependents: rows.rows.map((r) => r.id) } };
  }

  async sessionAuthor(token: string | null): Promise<{ id: string; role: string | null; pseudonym: string } | null> {
    if (!token) return null;
    const row = await this.pool.query<{ id: string; pseudonym: string; role: string | null }>(
      `SELECT a.id, a.pseudonym, r.role FROM sessions s
       JOIN authors a ON a.id = s.author_id
       LEFT JOIN author_roles r ON r.author_id = a.id
       WHERE s.secret_hash = $1 AND s.revoked_at IS NULL AND s.expires_at > now() AND a.disabled = false`,
      [keyedHash(this.config.pepper, token)],
    );
    return row.rows[0] ?? null;
  }

  async dismissReturn(authorId: string | null): Promise<Result> {
    if (!authorId) return { status: 401, body: { code: "unauthorized" } };
    await this.pool.query(
      `INSERT INTO author_cursors(author_id, seen_at) VALUES ($1, now())
       ON CONFLICT (author_id) DO UPDATE SET seen_at = now()`,
      [authorId],
    );
    return { status: 200, body: { code: "dismissed" } };
  }

  async reserve(evaluation: boolean): Promise<{ ok: true; id: string; amount: number } | { ok: false; reason: string }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const reserved = await reserveBudget(client, this.config, new Date().toISOString().slice(0, 7), evaluation);
      if (!reserved.ok) {
        await client.query("ROLLBACK");
        return reserved;
      }
      await client.query("COMMIT");
      return reserved;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async settle(id: string, actual: number): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await reconcileBudget(client, id, actual);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async purgeExpired(): Promise<number> {
    const result = await this.pool.query(
      `UPDATE proposals SET private_text = NULL
       WHERE private_text IS NOT NULL AND state = 'expired'
         AND expires_at < now() - ($1 || ' days')::interval`,
      [this.config.expiredTextPurgeDays],
    );
    return result.rowCount ?? 0;
  }

  private async isAdmin(authorId: string | null): Promise<boolean> {
    if (!authorId) return false;
    const row = await this.pool.query("SELECT 1 FROM author_roles WHERE author_id = $1 AND role = 'administrator'", [authorId]);
    return Boolean(row.rowCount);
  }

  private async loadReadable(id: string, capability: string | null, authorId: string | null): Promise<ProposalRow | null> {
    const row = await this.pool.query<ProposalRow>("SELECT * FROM proposals WHERE id = $1", [id]);
    const proposal = row.rows[0];
    if (!proposal) return null;
    if (proposal.author_id) return proposal.author_id === authorId ? proposal : null;
    if (!capability) return null;
    return proposal.capability_hash === keyedHash(this.config.pepper, capability) ? proposal : null;
  }

  private async lockProposal(client: pg.PoolClient, id: string, capability: string | null, authorId: string | null): Promise<ProposalRow | null> {
    const row = await client.query<ProposalRow>("SELECT * FROM proposals WHERE id = $1 FOR UPDATE", [id]);
    const proposal = row.rows[0];
    if (!proposal || proposal.state === "discarded") return null;
    if (proposal.author_id) return proposal.author_id === authorId ? proposal : null;
    if (!capability || !authorId) return null;
    if (proposal.capability_hash !== keyedHash(this.config.pepper, capability)) return null;
    return proposal;
  }

  private async occupants(client: pg.Pool | pg.PoolClient = this.pool): Promise<Occupant[]> {
    const rows = await client.query<Occupant & { hidden: boolean }>("SELECT x, y, footprint_w AS w, footprint_h AS h, hidden FROM placed_objects");
    return rows.rows.map((row) => ({ x: row.x, y: row.y, w: row.w, h: row.h, hidden: row.hidden }));
  }

  private async anchorCell(id: string, client: pg.Pool | pg.PoolClient = this.pool): Promise<{ x: number; y: number } | null> {
    const row = await client.query<{ x: number; y: number; hidden: boolean }>("SELECT x, y, hidden FROM placed_objects WHERE id = $1", [id]);
    const found = row.rows[0];
    if (!found || found.hidden) return null;
    return { x: found.x, y: found.y };
  }

  private capCookie(token: string): { name: string; value: string } {
    return { name: "__Host-sw_cap", value: token };
  }

  private sessionCookie(token: string): { name: string; value: string; maxAge: number } {
    return { name: "__Host-sw_session", value: token, maxAge: this.config.sessionMaxAgeDays * 86400 };
  }

  private async bumpCaps(capabilityHash: string, address: string): Promise<{ ok: true } | { ok: false; status: number; code: string }> {
    const globalOk = await this.bump("interpret-global", this.config.interpretGlobalPerHour, 3600);
    if (!globalOk) return { ok: false, status: 429, code: "paused" };
    const capOk = await this.bump(`interpret-cap:${capabilityHash}`, this.config.interpretPerCapability, this.config.interpretWindowMinutes * 60);
    if (!capOk) return { ok: false, status: 429, code: "rate_limited" };
    const net = networkKey(this.config.pepper, address, this.networkSaltDay);
    const netOk = await this.bump(`interpret-net:${net}`, this.config.interpretPerNetworkKey, this.config.interpretWindowMinutes * 60);
    if (!netOk) return { ok: false, status: 429, code: "rate_limited" };
    return { ok: true };
  }

  private async bump(bucket: string, limit: number, windowSeconds: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const row = await client.query<{ count: number; window_start: Date }>("SELECT count, window_start FROM rate_buckets WHERE bucket = $1 FOR UPDATE", [bucket]);
      const current = row.rows[0];
      const fresh = !current || Date.now() - current.window_start.getTime() > windowSeconds * 1000;
      const count = fresh ? 1 : current.count + 1;
      if (current) {
        await client.query("UPDATE rate_buckets SET count = $2, window_start = CASE WHEN $3 THEN now() ELSE window_start END WHERE bucket = $1", [bucket, count, fresh]);
      } else {
        await client.query("INSERT INTO rate_buckets(bucket, count, window_start) VALUES ($1, 1, now())", [bucket]);
      }
      await client.query("COMMIT");
      return count <= limit;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

function notFound(): Result {
  return { status: 404, body: { code: "not_found", error: "Not found" } };
}
