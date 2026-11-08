import type { PoolClient } from "pg";
import type { AppConfig } from "../domain/config.js";
import { worstCaseUsd } from "../domain/config.js";

export async function reserveBudget(
  client: PoolClient,
  config: AppConfig,
  month: string,
  evaluation: boolean,
): Promise<{ ok: true; id: string; amount: number } | { ok: false; reason: string }> {
  if (config.interpreterKillSwitch) return { ok: false, reason: "kill-switch" };
  const amount = worstCaseUsd(config);
  await client.query("INSERT INTO budget_months(month) VALUES ($1) ON CONFLICT DO NOTHING", [month]);
  await client.query("SELECT month FROM budget_months WHERE month = $1 FOR UPDATE", [month]);
  const monthRow = await client.query<{ reserved_usd: string; spent_usd: string; eval_reserved_usd: string; eval_spent_usd: string }>(
    "SELECT reserved_usd, spent_usd, eval_reserved_usd, eval_spent_usd FROM budget_months WHERE month = $1",
    [month],
  );
  const row = monthRow.rows[0];
  if (!row) return { ok: false, reason: "month" };
  const held = Number(row.reserved_usd) + Number(row.spent_usd);
  const daily = config.interpreterMonthlyBudgetUsd / 30;
  const today = await client.query<{ sum: string }>(
    `SELECT COALESCE(SUM(CASE WHEN status = 'held' THEN amount_usd ELSE COALESCE(actual_usd, 0) END),0)::text AS sum
     FROM budget_reservations WHERE month = $1 AND created_at::date = now()::date AND status IN ('held','reconciled')`,
    [month],
  );
  if (Number(today.rows[0]?.sum ?? 0) + amount > daily + 1e-9) return { ok: false, reason: "daily" };
  if (held + amount > config.interpreterMonthlyBudgetUsd) return { ok: false, reason: "monthly" };
  if (evaluation) {
    const evalHeld = Number(row.eval_reserved_usd) + Number(row.eval_spent_usd);
    if (evalHeld + amount > config.interpreterEvalBudgetUsd) return { ok: false, reason: "eval" };
  }
  const concurrent = await client.query<{ n: string }>(
    "SELECT count(*)::text AS n FROM budget_reservations WHERE status = 'held'",
  );
  if (Number(concurrent.rows[0]?.n ?? 0) >= config.interpreterMaxConcurrent) return { ok: false, reason: "concurrency" };
  const id = crypto.randomUUID();
  await client.query(
    "INSERT INTO budget_reservations(id, month, amount_usd, eval, status) VALUES ($1,$2,$3,$4,'held')",
    [id, month, amount, evaluation],
  );
  await client.query(
    "UPDATE budget_months SET reserved_usd = reserved_usd + $2, eval_reserved_usd = eval_reserved_usd + $3 WHERE month = $1",
    [month, amount, evaluation ? amount : 0],
  );
  return { ok: true, id, amount };
}

export async function reconcileBudget(client: PoolClient, id: string, actual: number): Promise<void> {
  const found = await client.query<{ month: string; amount_usd: string; eval: boolean; status: string }>(
    "SELECT month, amount_usd, eval, status FROM budget_reservations WHERE id = $1 FOR UPDATE",
    [id],
  );
  const row = found.rows[0];
  if (!row || row.status !== "held") return;
  const amount = Number(row.amount_usd);
  const spent = Number.isFinite(actual) ? Math.min(Math.max(actual, 0), amount) : amount;
  await client.query("UPDATE budget_reservations SET status = 'reconciled', actual_usd = $2 WHERE id = $1", [id, spent]);
  await client.query(
    `UPDATE budget_months
     SET reserved_usd = reserved_usd - $2, spent_usd = spent_usd + $3,
         eval_reserved_usd = eval_reserved_usd - $4, eval_spent_usd = eval_spent_usd + $5
     WHERE month = $1`,
    [row.month, amount, spent, row.eval ? amount : 0, row.eval ? spent : 0],
  );
}
