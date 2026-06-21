import { describe, it, expect } from "vitest";
import { parseAndValidate } from "./validate.js";

const NOW = new Date("2025-01-01T12:00:00Z");

describe("parseAndValidate", () => {
  it("keeps schema-valid tasks and drops low confidence", () => {
    const raw = JSON.stringify({
      tasks: [
        { title: "Pay invoice", priority: "high", confidence: 0.9, due_date: "2025-01-10" },
        { title: "Maybe later", confidence: 0.2 },
      ],
    });
    const out = parseAndValidate(raw, NOW);
    expect(out).toHaveLength(1);
    expect(out[0]!.title).toBe("Pay invoice");
    expect(out[0]!.due_date).toBe("2025-01-10");
    expect(out[0]!.priority).toBe("high");
  });
  it("defaults priority to medium", () => {
    const out = parseAndValidate(JSON.stringify({ tasks: [{ title: "X", confidence: 0.8 }] }), NOW);
    expect(out[0]!.priority).toBe("medium");
  });
  it("extracts JSON wrapped in model prose / think tags", () => {
    const raw = `<think>let me think</think> Here you go: {"tasks":[{"title":"Do it","confidence":0.7}]} done`;
    const out = parseAndValidate(raw, NOW);
    expect(out).toHaveLength(1);
    expect(out[0]!.title).toBe("Do it");
  });
  it("returns [] for non-JSON / malformed output", () => {
    expect(parseAndValidate("I cannot help with that", NOW)).toEqual([]);
    expect(parseAndValidate("", NOW)).toEqual([]);
  });
  it("returns [] when injected content is not schema-shaped", () => {
    // Model coerced by injection into emitting a non-schema object → dropped, no crash.
    const raw = JSON.stringify({ action: "wire money", amount: 1000 });
    expect(parseAndValidate(raw, NOW)).toEqual([]);
  });
});
