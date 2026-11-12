import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const GITLEAKS_VERSION = "8.24.3";
const GITLEAKS_SHA256 = "9991e0b2903da4c8f6122b5c3186448b927a5da4deef1fe45271c3793f4ee29c";
const ROOT = resolve(process.cwd());
const ALLOWED_EMAILS = new Set(["cursoragent@cursor.com"]);

const homePrefix = ["", "home", ""].join("/");
const usersPrefix = ["", "Users", ""].join("/");
const workspacePrefix = "/" + "work" + "space";
const storePrefix = "cursor" + "/stores";
const optPrefix = "/" + "opt" + "/cursor";
const droppedJourneyNote = "Optional related " + "working notes";

export function forbiddenPatterns() {
  return [homePrefix, usersPrefix, workspacePrefix, storePrefix, optPrefix];
}

export function scanText(text, file = "text") {
  const hits = [];
  for (const pattern of forbiddenPatterns()) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const expression = new RegExp(`(^|[^A-Za-z0-9])${escaped}`);
    if (expression.test(text)) hits.push(`${file}: denylist`);
  }
  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  for (const email of emails) {
    const lower = email.toLowerCase();
    const noreply = lower.endsWith("@users.noreply.github.com") && (lower.startsWith("bribeirobr25@") || lower.endsWith("+bribeirobr25@users.noreply.github.com"));
    if (!ALLOWED_EMAILS.has(lower) && !noreply) hits.push(`${file}: email`);
  }
  return hits;
}

export function scanPng(buffer, file) {
  const hits = [];
  if (buffer.length < 8 || buffer.toString("ascii", 1, 4) !== "PNG") return hits;
  let offset = 8;
  const allowed = new Set(["IHDR", "PLTE", "tRNS", "IDAT", "IEND"]);
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    if (!allowed.has(type)) hits.push(`${file}: png ${type}`);
    offset += 12 + length;
  }
  return hits;
}

export function scanPdf(buffer, file) {
  const text = buffer.toString("latin1");
  const hits = [];
  const decoded = text.replace(/#([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
  if (decoded.includes("/CreationDate") || decoded.includes("/ModDate") || decoded.includes("/Author") || decoded.includes("/URI")) {
    hits.push(`${file}: pdf metadata`);
  }
  return hits;
}

export function scanPngBytes(buffer, file) {
  const hits = scanPng(buffer, file);
  for (const type of ["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]) {
    if (buffer.includes(Buffer.from(type))) hits.push(`${file}: png ${type}`);
  }
  return hits;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".git" || name === "tools" || name === "test-results" || name === "playwright-report") continue;
    const full = join(dir, name);
    const info = statSync(full);
    if (info.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

export function scanTree(root = ROOT) {
  const hits = [];
  for (const file of walk(root)) {
    const rel = relative(root, file);
    const buf = readFileSync(file);
    if (file.endsWith(".png")) hits.push(...scanPngBytes(buf, rel));
    if (file.endsWith(".pdf")) hits.push(...scanPdf(buf, rel));
    if (file.endsWith(".docx")) {
      try {
        const xml = execFileSync("unzip", ["-p", file, "word/document.xml"], { encoding: "utf8" });
        hits.push(...scanText(xml, rel));
        if (xml.includes(droppedJourneyNote)) hits.push(`${rel}: journey note`);
      } catch {
        hits.push(`${rel}: docx unreadable`);
      }
    }
    if (/\.(md|json|ts|tsx|js|mjs|css|html|yml|yaml|svg|sql|txt|example)$/.test(file)) {
      hits.push(...scanText(buf.toString("utf8"), rel));
    }
  }
  return hits;
}

function allowedIdentity(name, email) {
  const lower = email.toLowerCase();
  if (name === "Cursor Agent" && lower === "cursoragent@cursor.com") return true;
  return lower.endsWith("@users.noreply.github.com") && (lower.startsWith("bribeirobr25@") || lower.endsWith("+bribeirobr25@users.noreply.github.com"));
}

export function scanCommitRange(range) {
  const raw = execFileSync("git", ["log", range, "--format=%H%x1e"], { encoding: "utf8" });
  const hits = [];
  for (const hash of raw.split("\x1e").map((part) => part.trim()).filter(Boolean)) {
    const meta = execFileSync("git", ["show", "-s", `--format=%an%x00%ae%x00%cn%x00%ce%x00%B`, hash], { encoding: "utf8" });
    const [name, email, committer, committerEmail, body] = meta.split("\x00");
    if (!allowedIdentity(name ?? "", email ?? "") || !allowedIdentity(committer ?? "", committerEmail ?? "")) {
      hits.push("commit identity");
    }
    hits.push(...scanText(body ?? "", "commit message"));
    const patch = execFileSync("git", ["diff-tree", "--no-commit-id", "-p", hash], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    hits.push(...scanText(patch, "commit blob"));
  }
  return hits;
}

function scanStaged() {
  try {
    const staged = execFileSync("git", ["diff", "--cached", "--binary"], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
    return scanText(staged, "index");
  } catch {
    return ["index unavailable"];
  }
}

async function gitleaks() {
  const dir = join(ROOT, "tools");
  const bin = join(dir, "gitleaks");
  if (!existsSync(bin)) {
    mkdirSync(dir, { recursive: true });
    const url = `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz`;
    const response = await fetch(url);
    if (!response.ok || !response.body) throw new Error("gitleaks download failed");
    const tar = join(dir, "gitleaks.tar.gz");
    await pipeline(Readable.fromWeb(response.body), createWriteStream(tar));
    const digest = createHash("sha256").update(readFileSync(tar)).digest("hex");
    if (digest !== GITLEAKS_SHA256) throw new Error("gitleaks checksum mismatch");
    execFileSync("tar", ["-xzf", tar, "-C", dir, "gitleaks"]);
  }
  return bin;
}

async function main() {
  const mode = process.argv[2] ?? "precommit";
  const hits = [...scanTree(ROOT), ...scanStaged()];
  if (process.env.PR_TITLE || process.env.PR_BODY) {
    hits.push(...scanText(`${process.env.PR_TITLE ?? ""}\n${process.env.PR_BODY ?? ""}`, "pull request"));
  }
  const bin = await gitleaks();
  try {
    execFileSync(bin, ["detect", "--no-git", "--source", ROOT, "--redact", "--no-banner", "--exit-code", "1"], { stdio: "pipe" });
  } catch (error) {
    const stderr = error.stderr?.toString() ?? "";
    if (stderr) hits.push("gitleaks");
    else hits.push("gitleaks");
  }
  if (mode === "prepush" || mode === "ci") {
    const range = process.argv[3] ?? "origin/main..HEAD";
    try {
      hits.push(...scanCommitRange(range));
      execFileSync(bin, ["detect", "--redact", "--no-banner", "--exit-code", "1", "--log-opts", range], { stdio: "pipe" });
    } catch {
      hits.push("commit range unavailable");
    }
    hits.push(...scanText(execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }), "branch"));
  }
  if (hits.length) {
    console.error(`privacy gate failed (${hits.length} findings, details redacted)`);
    process.exit(1);
  }
  console.log(`privacy gate passed (${mode})`);
}

const gateApi = { scanText, scanPdf, scanPng, scanPngBytes, scanTree, forbiddenPatterns, scanCommitRange };
export default gateApi;

if (process.argv[1] && resolve(process.argv[1]) === join(ROOT, "scripts/privacy-gate.mjs")) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "privacy gate failed");
    process.exit(1);
  });
}
