import { describe, it, expect } from "vitest";
import { sanitizeEmailBody } from "./sanitize.js";

describe("sanitizeEmailBody", () => {
  it("strips <script> and <style> from html", () => {
    const out = sanitizeEmailBody({ html: "<p>Pay invoice</p><script>alert(1)</script><style>.x{}</style>" });
    expect(out).toContain("Pay invoice");
    expect(out).not.toMatch(/alert\(1\)/);
    expect(out).not.toMatch(/\.x\{/);
  });

  it("strips zero-width and soft-hyphen characters", () => {
    const out = sanitizeEmailBody({ text: "in​vo‍ice﻿ due­" });
    expect(out).toBe("invoice due");
  });

  it("removes quoted replies", () => {
    const out = sanitizeEmailBody({ text: "My reply here\nOn Mon, Jan 1, 2025 at 9:00 AM Bob wrote:\n> old stuff\n> more old" });
    expect(out).toBe("My reply here");
  });

  it("removes a standard signature", () => {
    const out = sanitizeEmailBody({ text: "Real content\n-- \nJohn Doe\nCEO" });
    expect(out).toBe("Real content");
  });

  it("prefers text/plain over html", () => {
    const out = sanitizeEmailBody({ text: "plain wins", html: "<p>html loses</p>" });
    expect(out).toBe("plain wins");
  });

  it("truncates to 4000 chars", () => {
    const out = sanitizeEmailBody({ text: "a".repeat(5000) });
    expect(out.length).toBe(4000);
  });
});
