import type { LLMProvider } from "./types.js";
import type { ExtractedTask } from "@inboxtasks/shared";
import { taskJsonSchema } from "@inboxtasks/shared";
import { EXTRACTION_SYSTEM, buildExtractionUser } from "./prompt.js";
import { parseAndValidate } from "./validate.js";

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama" as const;
  constructor(
    private url: string,
    private model = "qwen3:8b",
  ) {}

  async isAvailable(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch(`${this.url}/api/tags`, { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  }

  async extractTasks(email: { subject: string; snippet: string }): Promise<ExtractedTask[]> {
    const res = await fetch(`${this.url}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: taskJsonSchema,
        options: { temperature: 0 },
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM },
          { role: "user", content: buildExtractionUser(email) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`ollama extract failed: ${res.status}`);
    const data = (await res.json()) as { message?: { content?: string } };
    return parseAndValidate(data.message?.content ?? "{}");
  }

  async chat(history: { role: string; content: string }[], context: string): Promise<string> {
    const res = await fetch(`${this.url}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        options: { temperature: 0.2 },
        messages: [{ role: "system", content: context }, ...history],
      }),
    });
    if (!res.ok) throw new Error(`ollama chat failed: ${res.status}`);
    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content ?? "";
  }
}
