import type { RunMode } from "../domain/config.js";

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Local test treats localhost, 127.0.0.1, and ::1 on this process's port as one browser.
 * Production accepts only the configured origin, exactly.
 */
export function originAllowed(
  header: string | undefined,
  appOrigin: string,
  runMode: RunMode,
  boundPort: number,
): boolean {
  if (!header || header === "null") return false;
  const request = parseOrigin(header);
  const configured = parseOrigin(appOrigin);
  if (request && configured && request === configured) return true;
  if (runMode !== "local-test" || !request) return false;
  let url: URL;
  try {
    url = new URL(header);
  } catch {
    return false;
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return false;
  if (url.protocol !== "http:") return false;
  if (!LOOPBACK.has(loopbackHost(url.hostname))) return false;
  const port = url.port ? Number(url.port) : 80;
  return port === boundPort;
}

function loopbackHost(hostname: string): string {
  const name = hostname.toLowerCase();
  return name.startsWith("[") && name.endsWith("]") ? name.slice(1, -1) : name;
}

function parseOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}
