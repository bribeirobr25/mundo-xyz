import { existsSync } from "node:fs";

export const LOCAL_PORT = 4500;
export const LOCAL_ORIGIN = `http://127.0.0.1:${LOCAL_PORT}`;

/** Debian/Ubuntu, then Homebrew's usual socket directory, then versioned Homebrew data directories. */
export const SOCKET_DIRECTORIES = [
  "/var/run/postgresql",
  "/tmp",
  "/opt/homebrew/var/postgresql@16",
  "/opt/homebrew/var/postgresql@17",
  "/usr/local/var/postgresql@16",
  "/usr/local/var/postgresql@17",
];

export function listenPort(env: string | undefined = process.env.PORT): number {
  return Number(env ?? LOCAL_PORT);
}

export type PoolTarget =
  | { host: string; database: string }
  | { connectionString: string };

export function databaseTarget(
  database: string,
  exists: (path: string) => boolean = existsSync,
): PoolTarget {
  for (const host of SOCKET_DIRECTORIES) {
    if (exists(`${host}/.s.PGSQL.5432`)) return { host, database };
  }
  return { connectionString: `postgresql://localhost:5432/${database}` };
}
