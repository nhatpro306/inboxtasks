import { describe, it, expect } from "vitest";
import { maskSecret, isDueWithin } from "./util.js";

describe("maskSecret", () => {
  it("returns empty string for empty string", () => {
    expect(maskSecret("")).toBe("");
  });

  it("returns empty string for null", () => {
    expect(maskSecret(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(maskSecret(undefined)).toBe("");
  });

  it("masks all but last 4 chars", () => {
    expect(maskSecret("abcdef")).toBe("••••cdef");
  });
});

describe("isDueWithin", () => {
  it("returns true when due date is within lead window", () => {
    const now = new Date();
    const dueDate = new Date(now.getTime() + 30 * 60000); // now + 30 min
    expect(isDueWithin(dueDate, now, 60)).toBe(true);
  });

  it("returns false when due date is beyond lead window", () => {
    const now = new Date();
    const dueDate = new Date(now.getTime() + 2 * 60 * 60000); // now + 2 hours
    expect(isDueWithin(dueDate, now, 60)).toBe(false);
  });

  it("returns false for null due date", () => {
    const now = new Date();
    expect(isDueWithin(null, now, 60)).toBe(false);
  });

  it("returns false for undefined due date", () => {
    const now = new Date();
    expect(isDueWithin(undefined, now, 60)).toBe(false);
  });
});
