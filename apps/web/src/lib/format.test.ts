import { describe, it, expect } from "vitest";
import {
  fmtDate,
  fmtDay,
  fmtTime,
  fmtDateTime,
  hasTime,
  isToday,
  isOverdue,
  urlBase64ToUint8Array,
} from "./format.js";

describe("format", () => {
  describe("fmtDate and fmtDay", () => {
    it("formats standard date-only strings", () => {
      expect(fmtDate("2026-10-18")).toBe("Oct 18, 2026");
      expect(fmtDay("2026-10-18")).toBe("Sun, Oct 18");
    });

    it("formats ISO midnight timestamps without offset shifting the day", () => {
      expect(fmtDate("2026-10-18T00:00:00.000Z")).toBe("Oct 18, 2026");
      expect(fmtDay("2026-10-18T00:00:00.000Z")).toBe("Sun, Oct 18");

      expect(fmtDate("2026-10-18T00:00:00Z")).toBe("Oct 18, 2026");
      expect(fmtDay("2026-10-18T00:00:00Z")).toBe("Sun, Oct 18");
    });

    it("returns empty string for null, undefined, or empty string", () => {
      expect(fmtDate(null)).toBe("");
      expect(fmtDate(undefined)).toBe("");
      expect(fmtDate("")).toBe("");

      expect(fmtDay(null)).toBe("");
      expect(fmtDay(undefined)).toBe("");
      expect(fmtDay("")).toBe("");
    });
  });

  describe("hasTime", () => {
    it("returns true for timestamps with explicit non-zero times", () => {
      expect(hasTime("2026-10-18T09:30:00")).toBe(true);
      expect(hasTime("2026-10-18T14:15:00")).toBe(true);
      expect(hasTime("2026-10-18T23:59:59.000Z")).toBe(true);
    });

    it("returns false for date-only strings and midnight timestamps", () => {
      expect(hasTime("2026-10-18")).toBe(false);
      expect(hasTime("2026-10-18T00:00:00.000Z")).toBe(false);
      expect(hasTime("2026-10-18T00:00:00Z")).toBe(false);
      expect(hasTime("2026-10-18 00:00:00")).toBe(false);
      expect(hasTime("2026-10-18T00:00:00+00:00")).toBe(false);
    });

    it("returns false for null, undefined, empty, or invalid input", () => {
      expect(hasTime(null)).toBe(false);
      expect(hasTime(undefined)).toBe(false);
      expect(hasTime("")).toBe(false);
      expect(hasTime("not-a-date")).toBe(false);
    });
  });

  describe("fmtTime", () => {
    it("formats 12-hour time correctly", () => {
      expect(fmtTime("2026-10-18T09:30:00")).toBe("09:30 AM");
      expect(fmtTime("2026-10-18T14:15:00")).toBe("02:15 PM");
      expect(fmtTime("2026-10-18T00:00:00")).toBe("12:00 AM");
      expect(fmtTime("2026-10-18T12:00:00")).toBe("12:00 PM");
    });

    it("returns empty string for null, undefined, empty, or invalid input", () => {
      expect(fmtTime(null)).toBe("");
      expect(fmtTime(undefined)).toBe("");
      expect(fmtTime("")).toBe("");
      expect(fmtTime("invalid")).toBe("");
    });
  });

  describe("fmtDateTime", () => {
    it("includes time when hasTime is true", () => {
      expect(fmtDateTime("2026-10-18T09:30:00")).toBe("Oct 18 · 09:30 AM");
      expect(fmtDateTime("2026-10-18T14:15:00")).toBe("Oct 18 · 02:15 PM");
    });

    it("falls back to date-only formatting when hasTime is false", () => {
      expect(fmtDateTime("2026-10-18")).toBe("Oct 18, 2026");
      expect(fmtDateTime("2026-10-18T00:00:00.000Z")).toBe("Oct 18, 2026");
    });

    it("returns empty string for null, undefined, or empty string", () => {
      expect(fmtDateTime(null)).toBe("");
      expect(fmtDateTime(undefined)).toBe("");
      expect(fmtDateTime("")).toBe("");
    });
  });

  describe("isToday", () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    it("returns true for today's date in YYYY-MM-DD format", () => {
      expect(isToday(todayStr)).toBe(true);
    });

    it("returns true for today's date in ISO midnight format without UTC offset distortion", () => {
      expect(isToday(`${todayStr}T00:00:00.000Z`)).toBe(true);
      expect(isToday(`${todayStr}T00:00:00Z`)).toBe(true);
    });

    it("returns false for past and future dates", () => {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

      expect(isToday(yesterdayStr)).toBe(false);
      expect(isToday(tomorrowStr)).toBe(false);
      expect(isToday("2000-01-01")).toBe(false);
    });

    it("returns false for null, undefined, or empty string", () => {
      expect(isToday(null)).toBe(false);
      expect(isToday(undefined)).toBe(false);
      expect(isToday("")).toBe(false);
    });
  });

  describe("isOverdue", () => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    it("returns true for past dates", () => {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

      expect(isOverdue(yesterdayStr)).toBe(true);
      expect(isOverdue(`${yesterdayStr}T00:00:00.000Z`)).toBe(true);
      expect(isOverdue("2020-01-01")).toBe(true);
    });

    it("returns false for today's date", () => {
      expect(isOverdue(todayStr)).toBe(false);
      expect(isOverdue(`${todayStr}T00:00:00.000Z`)).toBe(false);
    });

    it("returns false for future dates", () => {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

      expect(isOverdue(tomorrowStr)).toBe(false);
      expect(isOverdue("2099-12-31")).toBe(false);
    });

    it("returns false for null, undefined, or empty string", () => {
      expect(isOverdue(null)).toBe(false);
      expect(isOverdue(undefined)).toBe(false);
      expect(isOverdue("")).toBe(false);
    });
  });

  describe("urlBase64ToUint8Array", () => {
    it("correctly converts standard base64 string to Uint8Array", () => {
      const result = urlBase64ToUint8Array("aGVsbG8=");
      expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]);
    });

    it("correctly handles unpadded base64 string", () => {
      const result = urlBase64ToUint8Array("aGVsbG8");
      expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]);
    });

    it("correctly handles URL-safe characters (- and _)", () => {
      const result = urlBase64ToUint8Array("-_8");
      expect(Array.from(result)).toEqual([251, 255]);
    });

    it("handles empty string", () => {
      const result = urlBase64ToUint8Array("");
      expect(Array.from(result)).toEqual([]);
    });
  });
});
