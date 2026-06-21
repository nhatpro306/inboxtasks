export type Priority = "low" | "medium" | "high";
export type TaskStatus = "suggested" | "accepted" | "in_progress" | "done" | "dismissed";
export type CreatedVia = "ai" | "manual" | "chat";
export type AiProviderPref = "auto" | "local" | "gemini";

export interface ExtractedTask {
  title: string;
  description?: string;
  due_date?: string | null;
  priority?: Priority;
  confidence: number;
}

export interface ProposedAction {
  type: "create_task" | "update_task" | "complete_task";
  payload: Record<string, unknown>;
}

export interface ChatResult {
  reply: string;
  proposed_action?: ProposedAction;
}
