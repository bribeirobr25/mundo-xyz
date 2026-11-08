import { createPool, migrate, resetDatabase } from "../src/server/db.js";
import { startHttp } from "../src/server/http.js";
import { WorldService } from "../src/server/service.js";
import type pg from "pg";
import type { AppConfig } from "../src/domain/config.js";
import { LOCAL_ORIGIN } from "../src/local-dev.js";

export type Client = {
  url: string;
  service: WorldService;
  call: (path: string, init?: { method?: string; body?: unknown; origin?: string | null }) => Promise<{ status: number; body: Record<string, unknown> }>;
  close: () => Promise<void>;
};

export async function boot(pool: pg.Pool, overrides: Partial<AppConfig> = {}): Promise<Client> {
  const service = WorldService.boot(pool, { appOrigin: LOCAL_ORIGIN, ...overrides });
  await service.seed();
  const http = await startHttp(service, 0);
  const jar = new Map<string, string>();
  return {
    url: http.url,
    service,
    close: http.close,
    call: async (path, init = {}) => {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (init.origin !== null) headers.origin = init.origin ?? LOCAL_ORIGIN;
      if (jar.size) headers.cookie = [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
      const response = await fetch(`${http.url}${path}`, {
        method: init.method ?? (init.body === undefined ? "GET" : "POST"),
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
      });
      for (const cookie of response.headers.getSetCookie()) {
        const [pair] = cookie.split(";");
        const name = pair?.slice(0, pair.indexOf("=")) ?? "";
        const value = pair?.slice(pair.indexOf("=") + 1) ?? "";
        if (cookie.includes("Max-Age=0")) jar.delete(name);
        else if (name) jar.set(name, value);
      }
      return { status: response.status, body: (await response.json()) as Record<string, unknown> };
    },
  };
}

export async function preparePool(): Promise<pg.Pool> {
  const pool = createPool();
  await migrate(pool);
  await resetDatabase(pool);
  return pool;
}
