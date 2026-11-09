import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import type { AppConfig } from "../domain/config.js";
import { assertNoExtra } from "../domain/action.js";
import { listenPort } from "../local-dev.js";
import { originAllowed } from "./origin.js";
import type { Result, WorldService } from "./service.js";

export function startHttp(service: WorldService, port = listenPort()): Promise<{ url: string; close: () => Promise<void> }> {
  let boundPort = port;
  const onRequest = (req: IncomingMessage, res: ServerResponse) => {
    void handle(service, req, res, boundPort);
  };
  const server = createServer(onRequest);
  const v6 = createServer(onRequest);
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      boundPort = typeof address === "object" && address ? address.port : port;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        resolveListen({
          url: `http://127.0.0.1:${boundPort}`,
          close: () => new Promise((done) => {
            let pending = 2;
            const step = () => {
              pending -= 1;
              if (pending === 0) done();
            };
            server.close(() => step());
            v6.close(() => step());
          }),
        });
      };
      v6.once("error", finish);
      v6.once("listening", finish);
      v6.listen(boundPort, "::1");
    });
  });
}

async function handle(service: WorldService, req: IncomingMessage, res: ServerResponse, boundPort: number): Promise<void> {
  const requestId = crypto.randomUUID();
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const method = req.method ?? "GET";
    const cookies = parseCookies(req.headers.cookie);
    const author = await service.sessionAuthor(cookies["__Host-sw_session"] ?? null);
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    const mutating = method !== "GET" && method !== "HEAD";
    if (mutating && !originAllowed(origin, service.config.appOrigin, service.config.runMode, boundPort)) {
      send(res, { status: 403, body: { code: "origin" } });
      return;
    }
    const network = requestAddress(req);
    if (method === "GET" && url.pathname === "/api/health") {
      send(res, { status: 200, body: { ok: true } });
      return;
    }
    if (method === "GET" && url.pathname === "/api/public-config") {
      send(res, {
        status: 200,
        body: {
          runMode: service.config.runMode,
          fixture: service.config.runMode === "local-test" && service.config.interpreterActivation === "off",
          testIdentity: service.config.publishAccess === "test-any-authenticated",
          pollIntervalMs: service.config.pollIntervalMs,
          promptMaxGraphemes: service.config.promptMaxGraphemes,
          publishingOpen: service.config.publishAccess !== null,
          appOrigin: service.config.appOrigin,
        },
      });
      return;
    }
    if (method === "GET" && url.pathname === "/api/world") {
      send(res, await service.world(author?.id ?? null), { etag: true, req });
      return;
    }
    if (method === "GET" && url.pathname === "/api/me") {
      send(res, {
        status: 200,
        body: author
          ? { signedIn: true, pseudonym: author.pseudonym, role: author.role, authorId: author.id }
          : { signedIn: false },
      });
      return;
    }
    if (method === "GET" && url.pathname === "/share") {
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Shared world</title><meta name="description" content="A shared illustrated world."><meta property="og:title" content="Shared world"><meta property="og:description" content="A shared illustrated world."></head><body><p>Shared world</p></body></html>`;
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    const body = mutating ? await readJson(req) : {};
    if (method === "POST" && url.pathname === "/api/interpret") {
      if (!assertNoExtra(body, ["text", "anchorId"])) {
        send(res, { status: 400, body: { code: "forbidden_field" } });
        return;
      }
      send(res, await service.interpret({
        text: String(body.text ?? ""),
        anchorId: typeof body.anchorId === "string" ? body.anchorId : null,
        capability: cookies["__Host-sw_cap"] ?? null,
        networkAddress: network,
      }));
      return;
    }
    const proposalMatch = url.pathname.match(/^\/api\/proposals\/([0-9a-f-]{36})\/(confirm|publish|discard|another-spot)$/);
    if (proposalMatch && method === "POST") {
      const id = proposalMatch[1] ?? "";
      const action = proposalMatch[2];
      if (action === "discard") {
        send(res, await service.discard(id, cookies["__Host-sw_cap"] ?? null, author?.id ?? null));
        return;
      }
      if (action === "another-spot") {
        send(res, await service.anotherSpot(id, cookies["__Host-sw_cap"] ?? null, author?.id ?? null));
        return;
      }
      if (action === "confirm") {
        if (!assertNoExtra(body, ["idempotencyKey"])) {
          send(res, { status: 400, body: { code: "forbidden_field" } });
          return;
        }
        send(res, await service.confirm({
          proposalId: id,
          capability: cookies["__Host-sw_cap"] ?? null,
          authorId: author?.id ?? null,
          idempotencyKey: String(body.idempotencyKey ?? ""),
        }));
        return;
      }
      if (!assertNoExtra(body, ["proposalVersion", "key"])) {
        send(res, { status: 400, body: { code: "forbidden_field" } });
        return;
      }
      send(res, await service.publish({
        proposalId: id,
        proposalVersion: Number(body.proposalVersion),
        key: String(body.key ?? ""),
        capability: cookies["__Host-sw_cap"] ?? null,
        authorId: author?.id ?? null,
      }));
      return;
    }
    if (method === "POST" && url.pathname === "/api/identity") {
      const extra = { ...body };
      delete extra.pseudonym;
      delete extra.acknowledge;
      send(res, await service.createIdentity({
        pseudonym: String(body.pseudonym ?? ""),
        acknowledge: body.acknowledge === true,
        capability: cookies["__Host-sw_cap"] ?? null,
        extra,
      }));
      return;
    }
    if (method === "POST" && url.pathname === "/api/recover") {
      send(res, await service.recover({ code: String(body.code ?? ""), networkAddress: network }));
      return;
    }
    if (method === "POST" && url.pathname === "/api/sign-out") {
      send(res, await service.signOut(cookies["__Host-sw_session"] ?? null));
      return;
    }
    if (method === "POST" && url.pathname === "/api/invites/redeem") {
      send(res, await service.redeemInvite({ code: String(body.code ?? ""), authorId: author?.id ?? null, networkAddress: network }));
      return;
    }
    if (method === "POST" && url.pathname === "/api/return/dismiss") {
      send(res, await service.dismissReturn(author?.id ?? null));
      return;
    }
    if (method === "POST" && url.pathname === "/api/admin/invites") {
      send(res, await service.mintInvite(author?.id ?? null, Number(body.maxRedemptions ?? service.config.inviteDefaultMaxRedemptions)));
      return;
    }
    if (method === "POST" && url.pathname === "/api/admin/invites/revoke") {
      send(res, await service.revokeInvite(author?.id ?? null, String(body.code ?? "")));
      return;
    }
    if (method === "POST" && url.pathname === "/api/admin/hide") {
      send(res, await service.hide(author?.id ?? null, String(body.contributionId ?? "")));
      return;
    }
    if (method === "POST" && url.pathname === "/api/admin/block") {
      send(res, await service.blockAuthor(author?.id ?? null, String(body.authorId ?? "")));
      return;
    }
    if (method === "GET" && url.pathname.startsWith("/api/admin/dependents/")) {
      send(res, await service.dependents(author?.id ?? null, url.pathname.split("/").pop() ?? ""));
      return;
    }
    if (method === "POST" && url.pathname === "/api/admin/grant") {
      send(res, { status: 404, body: { code: "not_found", error: "Not found" } });
      return;
    }
    if (method === "GET" && (url.pathname === "/" || url.pathname.startsWith("/c/") || url.pathname.startsWith("/assets/"))) {
      serveStatic(url.pathname, req, res);
      return;
    }
    send(res, { status: 404, body: { code: "not_found", error: "Not found" } });
  } catch (error) {
    console.log(JSON.stringify({ requestId, method: req.method, path: logPath(req.url), error: error instanceof Error ? error.name : "error" }));
    send(res, { status: 500, body: { code: "load_failed" } });
  } finally {
    console.log(JSON.stringify({ requestId, method: req.method, path: logPath(req.url), status: res.statusCode }));
  }
}

export function staticTarget(pathname: string): string | null {
  const dist = resolve("dist");
  const file = pathname.startsWith("/assets/") ? resolve(dist, `.${pathname}`) : resolve(dist, "index.html");
  const rel = relative(dist, file);
  if (rel.startsWith("..") || rel.startsWith("/") || rel === "") return null;
  return file;
}

export function encodeStatic(
  body: Buffer,
  acceptEncoding: string | undefined,
  pathname: string,
): { body: Buffer; headers: Record<string, string> } {
  const headers: Record<string, string> = {
    "content-type": staticType(pathname),
    "cache-control": pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    vary: "Accept-Encoding",
    "x-content-type-options": "nosniff",
  };
  if (acceptsGzip(acceptEncoding) && body.length >= GZIP_MIN_BYTES) {
    headers["content-encoding"] = "gzip";
    return { body: gzipSync(body), headers };
  }
  return { body, headers };
}

function staticType(pathname: string): string {
  if (pathname.endsWith(".js")) return "text/javascript";
  if (pathname.endsWith(".css")) return "text/css";
  return "text/html; charset=utf-8";
}

const GZIP_MIN_BYTES = 200;
const ETAG_HEX_CHARS = 16;

function acceptsGzip(header: string | undefined): boolean {
  if (!header) return false;
  let gzip: number | null = null;
  let star = 0;
  for (const part of header.split(",")) {
    const [token, ...params] = part.trim().split(";").map((piece) => piece.trim().toLowerCase());
    const quality = params.find((param) => param.startsWith("q="));
    const q = quality ? Number(quality.slice(2)) : 1;
    if (!Number.isFinite(q) || q <= 0) {
      if (token === "gzip") gzip = 0;
      continue;
    }
    if (token === "gzip") gzip = q;
    if (token === "*") star = q;
  }
  return (gzip ?? star) > 0;
}

function serveStatic(pathname: string, req: IncomingMessage, res: ServerResponse): void {
  const file = staticTarget(pathname);
  if (!file) {
    send(res, { status: 404, body: { code: "not_found", error: "Not found" } });
    return;
  }
  try {
    const encoded = encodeStatic(readFileSync(file), req.headers["accept-encoding"], pathname);
    res.writeHead(200, encoded.headers);
    res.end(encoded.body);
  } catch {
    send(res, { status: 404, body: { code: "not_found", error: "Not found" } });
  }
}

function send(res: ServerResponse, result: Result, options: { etag?: boolean; req?: IncomingMessage } = {}): void {
  const json = JSON.stringify(result.body);
  const headers: Record<string, string | string[]> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  };
  const cookies = [
    ...(result.cookies ?? []).map((cookie) => serializeCookie(cookie.name, cookie.value, cookie.maxAge)),
    ...(result.clearCookies ?? []).map((name) => serializeCookie(name, "", 0)),
  ];
  if (options.etag && result.status === 200 && cookies.length === 0) {
    const tag = `"${createHash("sha256").update(json).digest("hex").slice(0, ETAG_HEX_CHARS)}"`;
    headers.etag = tag;
    if (options.req?.headers["if-none-match"] === tag) {
      res.writeHead(304, { etag: tag, "cache-control": "no-store" });
      res.end();
      return;
    }
  }
  if (cookies.length) headers["set-cookie"] = cookies;
  res.writeHead(result.status, headers);
  res.end(json);
}

function serializeCookie(name: string, value: string, maxAge?: number): string {
  const parts = [`${name}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", "Secure"];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  return parts.join("; ");
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name && !(name in out)) out[name] = rest.join("=");
  }
  return out;
}

export function logPath(raw: string | undefined): string {
  const path = (raw ?? "/").split("?")[0] || "/";
  const known = path === "/" || path === "/share" || path.startsWith("/api/") || path.startsWith("/assets/") || path.startsWith("/c/");
  if (!known) return "/redacted";
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(path)) return "/redacted";
  if (path.split("/").some((segment) => /^[A-Z2-7-]{16,}$/.test(segment))) return "/redacted";
  return path;
}

function requestAddress(req: IncomingMessage): string {
  const forwarded = req.socket.remoteAddress ?? "0.0.0.0";
  return forwarded;
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.from(chunk as Buffer);
    size += buf.length;
    if (size > 8000) throw new Error("body");
    chunks.push(buf);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

export function publicBanner(config: AppConfig): string {
  if (config.runMode !== "local-test") return "";
  const parts = ["Test mode — fixture interpreter"];
  if (config.publishAccess === "test-any-authenticated") parts.push("test identity");
  return parts.join(" · ");
}
