import { createHmac, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function keyedHash(pepper: string, value: string): string {
  return createHmac("sha256", pepper).update(value).digest("hex");
}

export function groupedCode(bytes = 16): string {
  const raw = randomBytes(bytes);
  let bits = "";
  for (const b of raw) bits += b.toString(2).padStart(8, "0");
  const chars: string[] = [];
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    chars.push(ALPHABET[Number.parseInt(bits.slice(i, i + 5), 2)] ?? "A");
  }
  return chars.join("").replace(/(.{4})/g, "$1-").replace(/-$/, "");
}

export function networkKey(pepper: string, address: string, day: string): string {
  return keyedHash(pepper, `${day}|${address}`);
}
