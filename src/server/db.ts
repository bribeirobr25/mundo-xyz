import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { databaseTarget, type PoolTarget } from "../local-dev.js";

const { Pool } = pg;

export function poolConfig(databaseUrl: string | undefined, database: string): PoolTarget {
  if (databaseUrl) return { connectionString: databaseUrl };
  return databaseTarget(database);
}

export function createPool(databaseUrl = process.env.DATABASE_URL, database = "mundo_test"): pg.Pool {
  return new Pool(poolConfig(databaseUrl, database));
}

export async function migrate(pool: pg.Pool): Promise<void> {
  const sql = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "schema.sql"), "utf8");
  await pool.query(sql);
  await pool.query("REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC");
  await pool.query(`
    DO $$ BEGIN
      CREATE ROLE mundo_anon NOLOGIN;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

export async function resetDatabase(pool: pg.Pool): Promise<void> {
  await pool.query(`
    TRUNCATE
      budget_reservations, budget_months, rate_buckets, author_cursors, moderation_decisions,
      idempotency, narrative_states, object_relations, placed_objects, contributions, proposals,
      pseudonym_hidden, author_blocks, publish_grants, invites, recovery_codes, sessions,
      role_events, author_roles, authors, world
    RESTART IDENTITY CASCADE
  `);
}
