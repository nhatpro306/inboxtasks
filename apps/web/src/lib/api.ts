const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  status: string;
  created_via: string;
  ai_confidence: number | null;
  source_email_id: string | null;
  reminder_sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Suggestion extends Task {
  source_email: { subject: string | null; from: string } | null;
  match: number;
}

export interface Settings {
  ai_provider_pref: "auto" | "local" | "gemini";
  ollama_url: string;
  poll_interval_minutes: number;
  reminder_lead_minutes: number;
  calendar_provider: string | null;
  gemini_key_masked: string;
  calendar_connected: boolean;
  push_enabled: boolean;
}

export interface Account {
  id: string;
  email_address: string;
  imap_host: string;
  imap_port: number;
  auth_type: string;
  last_synced_at: string | null;
  last_seen_uid: number;
}

interface TaskQuery {
  status?: string;
  from?: string;
  to?: string;
}

export const api = {
  health: () => req<{ status: string }>("/health"),

  listTasks: (q?: TaskQuery) => {
    const params = new URLSearchParams();
    if (q?.status) params.set("status", q.status);
    if (q?.from) params.set("from", q.from);
    if (q?.to) params.set("to", q.to);
    const qs = params.toString();
    return req<Task[]>(`/api/tasks${qs ? `?${qs}` : ""}`);
  },

  createTask: (b: Partial<Task>) =>
    req<Task>("/api/tasks", { method: "POST", body: JSON.stringify(b) }),

  patchTask: (id: string, b: Partial<Task>) =>
    req<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(b) }),

  acceptTask: (id: string) =>
    req<Task>(`/api/tasks/${id}/accept`, { method: "POST" }),

  dismissTask: (id: string) =>
    req<void>(`/api/tasks/${id}/dismiss`, { method: "POST" }),

  deleteTask: (id: string) =>
    req<void>(`/api/tasks/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ confirm: true }),
    }),

  suggestions: () => req<Suggestion[]>("/api/suggestions"),

  scanNow: () => req<{ queued: boolean }>("/api/scan-now", { method: "POST" }),

  getSettings: () => req<Settings>("/api/settings"),

  putSettings: (b: Partial<Settings>) =>
    req<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(b) }),

  listAccounts: () => req<Account[]>("/api/accounts"),

  addAccount: (b: {
    email_address: string;
    imap_host: string;
    imap_port: number;
    auth_type: string;
    app_password: string;
  }) => req<Account>("/api/accounts", { method: "POST", body: JSON.stringify(b) }),

  deleteAccount: (id: string) =>
    req<void>(`/api/accounts/${id}`, { method: "DELETE" }),

  vapid: () => req<{ publicKey: string }>("/api/push/vapid"),

  subscribePush: (sub: object) =>
    req<void>("/api/push/subscribe", { method: "POST", body: JSON.stringify(sub) }),

  unsubscribePush: (endpoint: string) =>
    req<void>("/api/push/subscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    }),

  calendarConnect: () => req<{ url: string }>("/api/calendar/connect"),

  calendarSync: () => req<{ synced: number }>("/api/calendar/sync", { method: "POST" }),
};
