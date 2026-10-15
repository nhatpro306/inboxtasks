import type { LLMProvider } from "./types.js";
import type { ExtractedTask } from "@inboxtasks/shared";
import { EXTRACTION_SYSTEM, buildExtractionUser } from "./prompt.js";
import { parseAndValidate } from "./validate.js";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// Gemini REST responseSchema uses uppercase OpenAPI type names.
const geminiSchema = {
  type: "OBJECT",
  properties: {
    tasks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          due_date: { type: "STRING" },
          priority: { type: "STRING", enum: ["low", "medium", "high"] },
          confidence: { type: "NUMBER" },
        },
        required: ["title", "confidence"],
      },
    },
  },
  required: ["tasks"],
};

export class GeminiProvider implements LLMProvider {
  readonly name = "gemini" as const;
  constructor(
    private apiKey: string,
    private model = "gemini-2.5-flash",
  ) {}

  async isAvailable(): Promise<boolean> {
    return this.apiKey.length > 0;
  }

  async extractTasks(email: { subject: string; snippet: string }): Promise<ExtractedTask[]> {
    const text = await this.call({
      systemInstruction: { parts: [{ text: EXTRACTION_SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: buildExtractionUser(email) }] }],
      // NOTE: keep extraction in pure JSON mode with NO tools — responseMimeType+tools conflict in Gemini 2.5.
      generationConfig: { responseMimeType: "application/json", responseSchema: geminiSchema, temperature: 0 },
    });
    return parseAndValidate(text);
  }

  async chat(history: { role: string; content: string }[], context: string): Promise<string> {
    return this.call({
      systemInstruction: { parts: [{ text: context }] },
      contents: history.map((h) => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      })),
      generationConfig: { temperature: 0.2 },
    });
  }

  private async call(body: unknown): Promise<string> {
    if (!this.apiKey) throw new Error("gemini not configured");
    const res = await fetch(`${ENDPOINT}/${this.model}:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`gemini failed: ${res.status}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
}
