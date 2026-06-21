import { describe, it, expect } from "vitest";
import { normalizeDueDate } from "./normalize.js";

// Reference: Wed 2025-01-01 (UTC)
const NOW = new Date("2025-01-01T12:00:00Z");

describe("normalizeDueDate", () => {
  it("passes through ISO dates", () => {
    expect(normalizeDueDate("2025-03-15", NOW)).toBe("2025-03-15");
  });
  it("handles today/tomorrow/yesterday", () => {
    expect(normalizeDueDate("today", NOW)).toBe("2025-01-01");
    expect(normalizeDueDate("tomorrow", NOW)).toBe("2025-01-02");
    expect(normalizeDueDate("yesterday", NOW)).toBe("2024-12-31");
  });
  it("handles weekday names (next occurrence)", () => {
    expect(normalizeDueDate("friday", NOW)).toBe("2025-01-03");
    expect(normalizeDueDate("wednesday", NOW)).toBe("2025-01-08"); // not today
  });
  it("handles 'next <weekday>'", () => {
    expect(normalizeDueDate("next friday", NOW)).toBe("2025-01-10");
  });
  it("handles 'in N days'", () => {
    expect(normalizeDueDate("in 3 days", NOW)).toBe("2025-01-04");
  });
  it("returns null for empty/garbage", () => {
    expect(normalizeDueDate(null, NOW)).toBeNull();
    expect(normalizeDueDate("", NOW)).toBeNull();
    expect(normalizeDueDate("whenever you feel like it", NOW)).toBeNull();
  });
});
