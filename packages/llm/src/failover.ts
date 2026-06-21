import type { LLMProvider } from "./types.js";
import type { AiProviderPref, ExtractedTask } from "@inboxtasks/shared";
import { OllamaProvider } from "./ollama.js";
import { GeminiProvider } from "./gemini.js";

export interface LLMConfig {
  pref: AiProviderPref;
  ollamaUrl: string;
  geminiApiKey: string;
}

export interface ProviderPair {
  ollama: LLMProvider;
  gemini: LLMProvider;
}

export function createProviders(cfg: LLMConfig): ProviderPair {
  return { ollama: new OllamaProvider(cfg.ollamaUrl), gemini: new GeminiProvider(cfg.geminiApiKey) };
}

// Failover selector per spec. 'auto' → ollama if available, else gemini.
export async function pickProvider(pref: AiProviderPref, providers: ProviderPair): Promise<LLMProvider> {
  if (pref === "gemini") return providers.gemini;
  if (pref === "local") return providers.ollama;
  return (await providers.ollama.isAvailable()) ? providers.ollama : providers.gemini;
}

// Extraction with runtime failover: if the local primary throws, fall back to gemini when configured.
export async function extractWithFailover(
  cfg: LLMConfig,
  email: { subject: string; snippet: string },
): Promise<{ provider: string; tasks: ExtractedTask[] }> {
  const providers = createProviders(cfg);
  const primary = await pickProvider(cfg.pref, providers);
  try {
    return { provider: primary.name, tasks: await primary.extractTasks(email) };
  } catch (err) {
    if (primary.name === "ollama" && (await providers.gemini.isAvailable())) {
      return { provider: "gemini", tasks: await providers.gemini.extractTasks(email) };
    }
    throw err;
  }
}

// Chat with the same selection logic (no runtime failover mid-conversation).
export async function chatWithProvider(
  cfg: LLMConfig,
  history: { role: string; content: string }[],
  context: string,
): Promise<{ provider: string; reply: string }> {
  const providers = createProviders(cfg);
  const provider = await pickProvider(cfg.pref, providers);
  return { provider: provider.name, reply: await provider.chat(history, context) };
}
