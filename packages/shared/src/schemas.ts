import { z } from "zod";

export const priorityEnum = z.enum(["low", "medium", "high"]);
export const taskStatusEnum = z.enum(["suggested", "accepted", "in_progress", "done", "dismissed"]);

export const proposedActionSchema = z.object({
  type: z.enum(["create_task", "update_task", "complete_task"]),
  task_id: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  due_date: z.string().nullable().optional(),
  priority: priorityEnum.optional(),
  status: taskStatusEnum.optional(),
});

export const chatResponseSchema = z.object({
  reply: z.string(),
  proposed_action: proposedActionSchema.nullable().optional(),
});

export type ProposedActionParsed = z.infer<typeof proposedActionSchema>;
export type ChatResponseParsed = z.infer<typeof chatResponseSchema>;

// Shared task JSON schema the LLM must emit. required: title + confidence.
export const extractedTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  due_date: z.string().nullable().optional(),
  priority: priorityEnum.optional(),
  confidence: z.number().min(0).max(1),
});

export const extractionResultSchema = z.object({
  tasks: z.array(extractedTaskSchema),
});

export type ExtractedTaskParsed = z.infer<typeof extractedTaskSchema>;

// JSON Schema form passed to Ollama `format` / Gemini `responseSchema`.
export const taskJsonSchema = {
  type: "object",
  properties: {
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          due_date: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          confidence: { type: "number" },
        },
        required: ["title", "confidence"],
      },
    },
  },
  required: ["tasks"],
} as const;
