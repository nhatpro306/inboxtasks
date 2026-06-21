import type { ExtractedTask } from "@inboxtasks/shared";

export interface LLMProvider {
  name: "ollama" | "gemini";
  isAvailable(): Promise<boolean>;
  extractTasks(email: { subject: string; snippet: string }): Promise<ExtractedTask[]>;
  chat(history: { role: string; content: string }[], context: string): Promise<string>;
}

// Implementations (ollama, gemini, failover selector) land in Sprint 2.
export const LLM_PLACEHOLDER = true;
