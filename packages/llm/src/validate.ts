import { extractionResultSchema } from "@inboxtasks/shared";
import type { ExtractedTask } from "@inboxtasks/shared";
import { normalizeDueDate } from "./normalize.js";

const MIN_CONFIDENCE = 0.4;

// Parse raw model text → validated, normalized ExtractedTask[]. Anything off-schema is dropped, never thrown.
export function parseAndValidate(raw: string, now: Date = new Date()): ExtractedTask[] {
  const json = extractJson(raw);
  const result = extractionResultSchema.safeParse(json);
  if (!result.success) return [];
  return result.data.tasks
    .filter((t) => t.confidence >= MIN_CONFIDENCE)
    .map((t) => ({
      title: t.title.slice(0, 500),
      description: t.description ? t.description.slice(0, 2000) : undefined,
      due_date: normalizeDueDate(t.due_date, now),
      priority: t.priority ?? "medium",
      confidence: t.confidence,
    }));
}

// Tolerant JSON extraction: handles models that wrap JSON in prose / <think> tags.
export function extractJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    /* fall through */
  }
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) {
    try {
      return JSON.parse(raw.slice(first, last + 1));
    } catch {
      /* ignore */
    }
  }
  return { tasks: [] };
}
