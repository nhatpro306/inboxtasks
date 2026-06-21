export interface SerializedTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  created_via: string;
  ai_confidence: number | null;
  source_email_id: string | null;
  reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export function serializeTask(t: {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: string;
  status: string;
  createdVia: string;
  aiConfidence: number | null;
  sourceEmailId: string | null;
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): SerializedTask {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    due_date: t.dueDate ? t.dueDate.toISOString() : null,
    priority: t.priority,
    status: t.status,
    created_via: t.createdVia,
    ai_confidence: t.aiConfidence,
    source_email_id: t.sourceEmailId,
    reminder_sent_at: t.reminderSentAt ? t.reminderSentAt.toISOString() : null,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  };
}
