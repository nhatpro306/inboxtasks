import { randomUUID } from "node:crypto";

export interface MemoryTask {
  id: string;
  userId: string;
  sourceEmailId: string | null;
  title: string;
  description: string | null;
  dueDate: Date | null;
  priority: "low" | "medium" | "high" | string;
  status: "suggested" | "accepted" | "in_progress" | "done" | "dismissed" | string;
  createdVia: "ai" | "manual" | "chat" | string;
  aiConfidence: number | null;
  deletedAt: Date | null;
  reminderSentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sourceEmail?: {
    subject: string | null;
    fromAddress: string;
  } | null;
}

export interface MemorySettings {
  id: string;
  userId: string;
  aiProviderPref: "auto" | "local" | "gemini";
  ollamaUrl: string;
  geminiKeyRef: string | null;
  pollIntervalMinutes: number;
  calendarProvider: string | null;
  googleTokenRef: string | null;
  googleCalendarId: string | null;
  calendarSyncToken: string | null;
  reminderLeadMinutes: number;
  pushEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryAccount {
  id: string;
  userId: string;
  imapHost: string;
  imapPort: number;
  emailAddress: string;
  authType: string;
  secretRef: string;
  lastSeenUid: number;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  email_address?: string;
  imap_host?: string;
  imap_port?: number;
  auth_type?: string;
  last_seen_uid?: number;
  last_synced_at?: Date | null;
}

export interface MemoryChatMessage {
  id: string;
  userId: string;
  role: string;
  content: string;
  createdAt: Date;
}

export interface TaskFilter {
  status?: string | string[];
  from?: string | Date;
  to?: string | Date;
  includeDismissed?: boolean;
}

export interface CreateMemoryTaskInput {
  userId?: string;
  title: string;
  description?: string | null;
  dueDate?: Date | string | null;
  priority?: "low" | "medium" | "high" | string;
  status?: "suggested" | "accepted" | "in_progress" | "done" | "dismissed" | string;
  createdVia?: "ai" | "manual" | "chat" | string;
  aiConfidence?: number | null;
  sourceEmailId?: string | null;
  sourceEmail?: {
    subject: string | null;
    fromAddress: string;
  } | null;
}

// ── In-Memory Arrays and State ───────────────────────────────────────────────

export const tasks: MemoryTask[] = [];

export let settings: MemorySettings = {
  id: "default-settings",
  userId: "default-user",
  aiProviderPref: "auto",
  ollamaUrl: "http://localhost:11434",
  geminiKeyRef: null,
  pollIntervalMinutes: 60,
  calendarProvider: null,
  googleTokenRef: null,
  googleCalendarId: null,
  calendarSyncToken: null,
  reminderLeadMinutes: 60,
  pushEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const accounts: MemoryAccount[] = [];

export const chatMessages: MemoryChatMessage[] = [];

const settingsStore = new Map<string, MemorySettings>();

// ── CRUD Helpers: Tasks ──────────────────────────────────────────────────────

export function getMemoryTasks(userId?: string, filter?: TaskFilter): MemoryTask[] {
  const uid = userId ?? "default-user";
  let result = tasks.filter((t) => (uid === "all" || !userId || t.userId === uid) && t.deletedAt === null);

  if (filter) {
    if (filter.status !== undefined) {
      const statuses = Array.isArray(filter.status)
        ? filter.status
        : filter.status.split(",").map((s) => s.trim());
      result = result.filter((t) => statuses.includes(t.status));
    } else if (!filter.includeDismissed) {
      result = result.filter((t) => t.status !== "suggested" && t.status !== "dismissed");
    }

    if (filter.from) {
      const fromDate = new Date(filter.from);
      result = result.filter((t) => t.dueDate !== null && t.dueDate >= fromDate);
    }
    if (filter.to) {
      const toDate = new Date(filter.to);
      result = result.filter((t) => t.dueDate !== null && t.dueDate <= toDate);
    }
  } else {
    result = result.filter((t) => t.status !== "suggested" && t.status !== "dismissed");
  }

  return [...result].sort((a, b) => {
    if (a.dueDate && b.dueDate) {
      const diff = a.dueDate.getTime() - b.dueDate.getTime();
      if (diff !== 0) return diff;
    } else if (a.dueDate && !b.dueDate) {
      return -1;
    } else if (!a.dueDate && b.dueDate) {
      return 1;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export function createMemoryTask(data: CreateMemoryTaskInput): MemoryTask {
  const now = new Date();
  const task: MemoryTask = {
    id: randomUUID(),
    userId: data.userId ?? "default-user",
    title: data.title,
    description: data.description ?? null,
    dueDate: data.dueDate ? (data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate)) : null,
    priority: data.priority ?? "medium",
    status: data.status ?? "accepted",
    createdVia: data.createdVia ?? "manual",
    aiConfidence: data.aiConfidence ?? null,
    sourceEmailId: data.sourceEmailId ?? null,
    sourceEmail: data.sourceEmail ?? null,
    reminderSentAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  tasks.push(task);
  return task;
}

export function updateMemoryTask(
  id: string,
  data: Partial<Omit<MemoryTask, "id" | "userId" | "createdAt">>
): MemoryTask | null {
  const task = tasks.find((t) => t.id === id && t.deletedAt === null);
  if (!task) return null;

  if (data.title !== undefined) task.title = data.title;
  if (data.description !== undefined) task.description = data.description;
  if (data.dueDate !== undefined) {
    task.dueDate = data.dueDate ? (data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate)) : null;
  }
  if (data.priority !== undefined) task.priority = data.priority;
  if (data.status !== undefined) task.status = data.status;
  if (data.createdVia !== undefined) task.createdVia = data.createdVia;
  if (data.aiConfidence !== undefined) task.aiConfidence = data.aiConfidence;
  if (data.sourceEmailId !== undefined) task.sourceEmailId = data.sourceEmailId;
  if (data.sourceEmail !== undefined) task.sourceEmail = data.sourceEmail;
  if (data.reminderSentAt !== undefined) task.reminderSentAt = data.reminderSentAt;
  if (data.deletedAt !== undefined) task.deletedAt = data.deletedAt;
  task.updatedAt = new Date();

  return task;
}

export function deleteMemoryTask(id: string): boolean {
  const task = tasks.find((t) => t.id === id && t.deletedAt === null);
  if (!task) return false;
  task.deletedAt = new Date();
  task.updatedAt = new Date();
  return true;
}

// ── CRUD Helpers: Settings ───────────────────────────────────────────────────

export function getMemorySettings(userId: string = "default-user"): MemorySettings {
  let s = settingsStore.get(userId);
  if (!s) {
    if (userId === "default-user" || settingsStore.size === 0) {
      s = { ...settings, userId };
    } else {
      s = {
        id: randomUUID(),
        userId,
        aiProviderPref: "auto",
        ollamaUrl: "http://localhost:11434",
        geminiKeyRef: null,
        pollIntervalMinutes: 60,
        calendarProvider: null,
        googleTokenRef: null,
        googleCalendarId: null,
        calendarSyncToken: null,
        reminderLeadMinutes: 60,
        pushEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    settingsStore.set(userId, s);
    if (userId === "default-user" || settings.userId === userId) {
      settings = s;
    }
  }
  return s;
}

export function updateMemorySettings(
  userId: string = "default-user",
  data: Partial<MemorySettings>
): MemorySettings {
  const current = getMemorySettings(userId);
  Object.assign(current, data, { updatedAt: new Date() });
  if (userId === "default-user" || settings.userId === userId) {
    Object.assign(settings, current);
  }
  return current;
}

// ── CRUD Helpers: Accounts ───────────────────────────────────────────────────

export function getMemoryAccounts(userId?: string): MemoryAccount[] {
  const uid = userId ?? "default-user";
  return accounts.filter((a) => uid === "all" || !userId || a.userId === uid);
}

export function createMemoryAccount(data: {
  userId?: string;
  emailAddress: string;
  imapHost?: string;
  imapPort?: number;
  authType?: string;
  secretRef?: string;
}): MemoryAccount {
  const now = new Date();
  const account: MemoryAccount = {
    id: randomUUID(),
    userId: data.userId ?? "default-user",
    emailAddress: data.emailAddress,
    email_address: data.emailAddress,
    imapHost: data.imapHost ?? "imap.gmail.com",
    imap_host: data.imapHost ?? "imap.gmail.com",
    imapPort: data.imapPort ?? 993,
    imap_port: data.imapPort ?? 993,
    authType: data.authType ?? "app_password",
    auth_type: data.authType ?? "app_password",
    secretRef: data.secretRef ?? "",
    lastSeenUid: 0,
    last_seen_uid: 0,
    lastSyncedAt: null,
    last_synced_at: null,
    createdAt: now,
    updatedAt: now,
  };
  accounts.push(account);
  return account;
}

export function deleteMemoryAccount(id: string): boolean {
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) return false;
  accounts.splice(index, 1);
  return true;
}

// ── CRUD Helpers: Chat ───────────────────────────────────────────────────────

export function getMemoryChatHistory(userId?: string, limit: number = 50): MemoryChatMessage[] {
  const uid = userId ?? "default-user";
  const msgs = chatMessages
    .filter((m) => uid === "all" || !userId || m.userId === uid)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return msgs.slice(-limit);
}

export function createMemoryChatMessage(data: {
  userId?: string;
  role: string;
  content: string;
}): MemoryChatMessage {
  const message: MemoryChatMessage = {
    id: randomUUID(),
    userId: data.userId ?? "default-user",
    role: data.role,
    content: data.content,
    createdAt: new Date(),
  };
  chatMessages.push(message);
  return message;
}

export function clearMemoryStore(): void {
  tasks.length = 0;
  accounts.length = 0;
  chatMessages.length = 0;
  settingsStore.clear();
  settings = {
    id: "default-settings",
    userId: "default-user",
    aiProviderPref: "auto",
    ollamaUrl: "http://localhost:11434",
    geminiKeyRef: null,
    pollIntervalMinutes: 60,
    calendarProvider: null,
    googleTokenRef: null,
    googleCalendarId: null,
    calendarSyncToken: null,
    reminderLeadMinutes: 60,
    pushEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
