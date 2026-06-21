import { describe, it, expect, beforeAll } from "vitest";

const KEY = "a".repeat(64); // 32 bytes hex

describe("crypto (AES-256-GCM)", () => {
  beforeAll(() => {
    process.env.APP_MASTER_KEY = KEY;
  });

  it("round-trips a secret", async () => {
    const { encryptSecret, decryptSecret, __resetKeyCacheForTests } = await import("./crypto.js");
    __resetKeyCacheForTests();
    const secret = JSON.stringify({ user: "me@example.com", pass: "app-password-123" });
    const blob = encryptSecret(secret);
    expect(blob).not.toContain("app-password-123"); // ciphertext, not plaintext
    expect(blob.startsWith("v1.")).toBe(true);
    expect(decryptSecret(blob)).toBe(secret);
  });

  it("produces different ciphertext each call (random IV)", async () => {
    const { encryptSecret } = await import("./crypto.js");
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });

  it("rejects a tampered blob", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto.js");
    const blob = encryptSecret("hello");
    const parts = blob.split(".");
    const tamperedCt = Buffer.from("evil").toString("base64");
    expect(() => decryptSecret([parts[0], parts[1], parts[2], tamperedCt].join("."))).toThrow();
  });

  it("rejects a malformed blob", async () => {
    const { decryptSecret } = await import("./crypto.js");
    expect(() => decryptSecret("not-a-valid-blob")).toThrow("Malformed secret blob");
  });
});
