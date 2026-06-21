import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM at-rest encryption for IMAP credentials. Key from APP_MASTER_KEY.
const VERSION = "v1";
let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.APP_MASTER_KEY;
  if (!raw) throw new Error("APP_MASTER_KEY is not set");
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("APP_MASTER_KEY must decode to 32 bytes (64 hex chars or base64-encoded 32 bytes)");
  }
  cachedKey = key;
  return key;
}

// Returns "v1.<iv>.<tag>.<ciphertext>", all base64. Safe to store in DB.
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(".");
}

export function decryptSecret(blob: string): string {
  const parts = blob.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) throw new Error("Malformed secret blob");
  const [, ivB64, tagB64, ctB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64!, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64!, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ctB64!, "base64")), decipher.final()]).toString("utf8");
}

// For tests only: reset the cached key after changing APP_MASTER_KEY.
export function __resetKeyCacheForTests(): void {
  cachedKey = null;
}
