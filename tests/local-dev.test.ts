import { afterEach, expect, test } from "vitest";
import { loadConfig } from "../src/domain/config.js";
import { databaseTarget, listenPort, LOCAL_ORIGIN, LOCAL_PORT, SOCKET_DIRECTORIES } from "../src/local-dev.js";
import { poolConfig } from "../src/server/db.js";

const previousOrigin = process.env.APP_ORIGIN;
const previousPort = process.env.PORT;

afterEach(() => {
  if (previousOrigin === undefined) delete process.env.APP_ORIGIN;
  else process.env.APP_ORIGIN = previousOrigin;
  if (previousPort === undefined) delete process.env.PORT;
  else process.env.PORT = previousPort;
});

test("t.config.port and t.config.database-default", () => {
  delete process.env.APP_ORIGIN;
  delete process.env.PORT;
  expect(LOCAL_PORT).toBe(4500);
  expect(LOCAL_ORIGIN).toBe("http://127.0.0.1:4500");
  expect(listenPort(undefined)).toBe(4500);
  expect(listenPort("4599")).toBe(4599);
  expect(loadConfig().appOrigin).toBe(LOCAL_ORIGIN);
  process.env.APP_ORIGIN = "http://127.0.0.1:4599";
  expect(loadConfig().appOrigin).toBe("http://127.0.0.1:4599");

  const absent = databaseTarget("mundo_dev", () => false);
  expect(absent).toEqual({ connectionString: "postgresql://localhost:5432/mundo_dev" });
  const linux = databaseTarget("mundo_test", (path) => path === "/var/run/postgresql/.s.PGSQL.5432");
  expect(linux).toEqual({ host: "/var/run/postgresql", database: "mundo_test" });
  const homebrew = databaseTarget("mundo_dev", (path) => path === "/tmp/.s.PGSQL.5432");
  expect(homebrew).toEqual({ host: "/tmp", database: "mundo_dev" });
  const arm = databaseTarget("mundo_dev", (path) => path.startsWith("/opt/homebrew/var/postgresql@16"));
  expect(arm).toEqual({ host: "/opt/homebrew/var/postgresql@16", database: "mundo_dev" });
  const intel = databaseTarget("mundo_dev", (path) => path.startsWith("/usr/local/var/postgresql@16"));
  expect(intel).toEqual({ host: "/usr/local/var/postgresql@16", database: "mundo_dev" });
  expect(SOCKET_DIRECTORIES[0]).toBe("/var/run/postgresql");
  expect(poolConfig("postgresql://localhost:5432/custom", "mundo_test")).toEqual({
    connectionString: "postgresql://localhost:5432/custom",
  });
  expect(poolConfig(undefined, "mundo_test")).toEqual(databaseTarget("mundo_test"));
});
