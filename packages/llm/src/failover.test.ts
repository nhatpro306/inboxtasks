import { describe, it, expect } from "vitest";
import { pickProvider, type ProviderPair } from "./failover.js";
import type { LLMProvider } from "./types.js";

function stub(name: "ollama" | "gemini", available: boolean): LLMProvider {
  return {
    name,
    isAvailable: async () => available,
    extractTasks: async () => [],
    chat: async () => "",
  };
}

describe("pickProvider", () => {
  it("auto → ollama when ollama is available", async () => {
    const pair: ProviderPair = { ollama: stub("ollama", true), gemini: stub("gemini", true) };
    expect((await pickProvider("auto", pair)).name).toBe("ollama");
  });
  it("auto → gemini when ollama is down", async () => {
    const pair: ProviderPair = { ollama: stub("ollama", false), gemini: stub("gemini", true) };
    expect((await pickProvider("auto", pair)).name).toBe("gemini");
  });
  it("local → always ollama", async () => {
    const pair: ProviderPair = { ollama: stub("ollama", false), gemini: stub("gemini", true) };
    expect((await pickProvider("local", pair)).name).toBe("ollama");
  });
  it("gemini → always gemini", async () => {
    const pair: ProviderPair = { ollama: stub("ollama", true), gemini: stub("gemini", false) };
    expect((await pickProvider("gemini", pair)).name).toBe("gemini");
  });
});
