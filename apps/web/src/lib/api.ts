const BASE = import.meta.env.VITE_API_URL || "";

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const headers = new Headers(opts?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `${res.status} ${res.statusText}`;
    try {
      const json = await res.json();
      if (json && typeof json === "object") {
        if (typeof json.error === "string" && json.error.trim()) {
          errorMsg = json.error;
        } else if (typeof json.message === "string" && json.message.trim()) {
          errorMsg = json.message;
        }
      }
    } catch {
      // not JSON or body already read
    }
    throw new Error(errorMsg);
  }

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
  source_email: { subject: string | null; from: string; snippet?: string | null } | null;
  match: number;
  cleanSnippet?: string | null;
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

export interface SettingsUpdate extends Partial<Settings> {
  gemini_key?: string;
}

export interface CalendarSyncResult {
  pushed: number;
  updated: number;
  removed: number;
  synced: number;
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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface ProposedAction {
  type: "create_task" | "update_task" | "complete_task";
  task_id?: string;
  title?: string;
  description?: string;
  due_date?: string | null;
  priority?: "low" | "medium" | "high";
  status?: string;
}

interface TaskQuery {
  status?: string;
  from?: string;
  to?: string;
}

/* ─── Hybrid Client-side Persistence Helpers ─── */

const TASKS_STORAGE_KEY = "inboxtasks_tasks_v1";
const SETTINGS_STORAGE_KEY = "inboxtasks_settings_v1";
const ACCOUNTS_STORAGE_KEY = "inboxtasks_accounts_v1";
const CHAT_STORAGE_KEY = "inboxtasks_chat_v1";
const GEMINI_KEY_STORAGE = "inboxtasks_gemini_key";

function getStored<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, val: T): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

function getLocalTasks(): Task[] {
  return getStored<Task[]>(TASKS_STORAGE_KEY, []);
}

function setLocalTasks(tasks: Task[]): void {
  setStored(TASKS_STORAGE_KEY, tasks);
}

function upsertLocalTask(task: Task): void {
  const current = getLocalTasks();
  const idx = current.findIndex((t) => t.id === task.id);
  if (idx !== -1) {
    current[idx] = { ...current[idx], ...task };
  } else {
    current.unshift(task);
  }
  setLocalTasks(current);
}

function removeLocalTask(id: string): void {
  const current = getLocalTasks();
  setLocalTasks(current.filter((t) => t.id !== id));
}

function mergeTasksIntoCache(serverTasks: Task[]): Task[] {
  const local = getLocalTasks();
  const map = new Map<string, Task>();
  for (const t of local) {
    map.set(t.id, t);
  }
  for (const t of serverTasks) {
    map.set(t.id, t);
  }
  const merged = Array.from(map.values());
  setLocalTasks(merged);
  return merged;
}

function filterLocalTasks(tasks: Task[], q?: TaskQuery): Task[] {
  if (!q) return tasks;
  return tasks.filter((t) => {
    if (q.status && t.status !== q.status) return false;
    if (q.from && t.due_date && t.due_date < q.from) return false;
    if (q.to && t.due_date && t.due_date > q.to) return false;
    return true;
  });
}

export const api = {
  health: () => req<{ status: string }>("/health"),

  listTasks: async (q?: TaskQuery): Promise<Task[]> => {
    const params = new URLSearchParams();
    if (q?.status) params.set("status", q.status);
    if (q?.from) params.set("from", q.from);
    if (q?.to) params.set("to", q.to);
    const qs = params.toString();

    try {
      const data = await req<{ tasks?: Task[] } | Task[]>(`/api/tasks${qs ? `?${qs}` : ""}`);
      const serverTasks = Array.isArray(data) ? data : (data?.tasks ?? []);
      if (serverTasks && serverTasks.length > 0) {
        mergeTasksIntoCache(serverTasks);
        return serverTasks;
      }
      // If API returns empty, fall back to cached localStorage tasks
      return filterLocalTasks(getLocalTasks(), q);
    } catch {
      // If API fails, fall back to cached localStorage tasks
      return filterLocalTasks(getLocalTasks(), q);
    }
  },

  createTask: async (b: Partial<Task>): Promise<Task> => {
    try {
      const created = await req<Task>("/api/tasks", { method: "POST", body: JSON.stringify(b) });
      upsertLocalTask(created);
      return created;
    } catch {
      const now = new Date().toISOString();
      const localTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: b.title || "Untitled",
        description: b.description ?? null,
        due_date: b.due_date ?? null,
        priority: b.priority ?? "medium",
        status: b.status ?? "accepted",
        created_via: b.created_via ?? "manual",
        ai_confidence: b.ai_confidence ?? null,
        source_email_id: b.source_email_id ?? null,
        reminder_sent_at: b.reminder_sent_at ?? null,
        created_at: now,
        updated_at: now,
        ...b,
      } as Task;
      upsertLocalTask(localTask);
      return localTask;
    }
  },

  patchTask: async (id: string, b: Partial<Task>): Promise<Task> => {
    try {
      const updated = await req<Task>(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify(b) });
      upsertLocalTask(updated);
      return updated;
    } catch {
      const current = getLocalTasks();
      const idx = current.findIndex((t) => t.id === id);
      if (idx !== -1) {
        const localUpdated: Task = {
          ...current[idx],
          ...b,
          updated_at: new Date().toISOString(),
        };
        current[idx] = localUpdated;
        setLocalTasks(current);
        return localUpdated;
      }
      throw new Error(`Task ${id} not found`);
    }
  },

  acceptTask: async (id: string): Promise<Task> => {
    try {
      const accepted = await req<Task>(`/api/tasks/${id}/accept`, { method: "POST" });
      upsertLocalTask(accepted);
      return accepted;
    } catch {
      const current = getLocalTasks();
      const idx = current.findIndex((t) => t.id === id);
      if (idx !== -1) {
        const localAccepted: Task = {
          ...current[idx],
          status: "accepted",
          updated_at: new Date().toISOString(),
        };
        current[idx] = localAccepted;
        setLocalTasks(current);
        return localAccepted;
      }
      throw new Error(`Task ${id} not found`);
    }
  },

  dismissTask: async (id: string): Promise<void> => {
    const current = getLocalTasks();
    const idx = current.findIndex((t) => t.id === id);
    if (idx !== -1) {
      current[idx] = {
        ...current[idx],
        status: "dismissed",
        updated_at: new Date().toISOString(),
      };
      setLocalTasks(current);
    }
    try {
      await req<void>(`/api/tasks/${id}/dismiss`, { method: "POST" });
    } catch {
      // dismissed locally
    }
  },

  deleteTask: async (id: string): Promise<void> => {
    removeLocalTask(id);
    try {
      await req<void>(`/api/tasks/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ confirm: true }),
      });
    } catch {
      // deleted locally
    }
  },

  suggestions: async (): Promise<Suggestion[]> => {
    const data = await req<{ suggestions?: Suggestion[] } | Suggestion[]>("/api/suggestions");
    return Array.isArray(data) ? data : (data?.suggestions ?? []);
  },

  scanNow: () => req<{ queued: boolean }>("/api/scan-now", { method: "POST" }),

  getSettings: async (): Promise<Settings> => {
    const defaultSettings: Settings = {
      ai_provider_pref: "auto",
      ollama_url: "http://localhost:11434",
      poll_interval_minutes: 15,
      reminder_lead_minutes: 30,
      calendar_provider: null,
      gemini_key_masked: "",
      calendar_connected: false,
      push_enabled: false,
    };
    const cachedSettings = getStored<Partial<Settings>>(SETTINGS_STORAGE_KEY, {});
    const cachedGeminiKey =
      typeof localStorage !== "undefined" ? localStorage.getItem(GEMINI_KEY_STORAGE) : null;

    try {
      const server = await req<Settings>("/api/settings");
      const maskedKey =
        server.gemini_key_masked ||
        (cachedGeminiKey ? `••••••••${cachedGeminiKey.slice(-4)}` : (cachedSettings.gemini_key_masked || ""));
      const merged: Settings = {
        ...defaultSettings,
        ...cachedSettings,
        ...server,
        gemini_key_masked: maskedKey,
      };
      setStored(SETTINGS_STORAGE_KEY, merged);
      return merged;
    } catch {
      const maskedKey = cachedGeminiKey
        ? `••••••••${cachedGeminiKey.slice(-4)}`
        : (cachedSettings.gemini_key_masked || "");
      return {
        ...defaultSettings,
        ...cachedSettings,
        gemini_key_masked: maskedKey,
      };
    }
  },

  putSettings: async (b: SettingsUpdate): Promise<Settings> => {
    if (b.gemini_key !== undefined) {
      if (b.gemini_key.trim()) {
        try {
          localStorage.setItem(GEMINI_KEY_STORAGE, b.gemini_key.trim());
        } catch {}
      } else {
        try {
          localStorage.removeItem(GEMINI_KEY_STORAGE);
        } catch {}
      }
    }

    const currentCached = getStored<Partial<Settings>>(SETTINGS_STORAGE_KEY, {});
    const updatedLocal = { ...currentCached, ...b };
    setStored(SETTINGS_STORAGE_KEY, updatedLocal);

    try {
      const server = await req<Settings>("/api/settings", { method: "PUT", body: JSON.stringify(b) });
      const cachedGeminiKey =
        typeof localStorage !== "undefined" ? localStorage.getItem(GEMINI_KEY_STORAGE) : null;
      const maskedKey =
        server.gemini_key_masked ||
        (cachedGeminiKey ? `••••••••${cachedGeminiKey.slice(-4)}` : "");
      const merged: Settings = {
        ...server,
        ...updatedLocal,
        gemini_key_masked: maskedKey,
      };
      setStored(SETTINGS_STORAGE_KEY, merged);
      return merged;
    } catch {
      const cachedGeminiKey =
        typeof localStorage !== "undefined" ? localStorage.getItem(GEMINI_KEY_STORAGE) : null;
      return {
        ai_provider_pref: b.ai_provider_pref ?? currentCached.ai_provider_pref ?? "auto",
        ollama_url: b.ollama_url ?? currentCached.ollama_url ?? "http://localhost:11434",
        poll_interval_minutes: b.poll_interval_minutes ?? currentCached.poll_interval_minutes ?? 15,
        reminder_lead_minutes: b.reminder_lead_minutes ?? currentCached.reminder_lead_minutes ?? 30,
        calendar_provider: b.calendar_provider ?? currentCached.calendar_provider ?? null,
        gemini_key_masked: cachedGeminiKey ? `••••••••${cachedGeminiKey.slice(-4)}` : (currentCached.gemini_key_masked ?? ""),
        calendar_connected: b.calendar_connected ?? currentCached.calendar_connected ?? false,
        push_enabled: b.push_enabled ?? currentCached.push_enabled ?? false,
      };
    }
  },

  testGeminiKey: (gemini_key: string): Promise<{ ok: boolean; error?: string }> =>
    req<{ ok: boolean; error?: string }>("/api/settings/test-gemini", {
      method: "POST",
      body: JSON.stringify({ gemini_key }),
    }),

  listAccounts: async (): Promise<Account[]> => {
    try {
      const data = await req<{ accounts?: Account[] } | Account[]>("/api/accounts");
      const accounts = Array.isArray(data) ? data : (data?.accounts ?? []);
      if (accounts.length > 0) {
        setStored(ACCOUNTS_STORAGE_KEY, accounts);
        return accounts;
      }
      const cached = getStored<Account[]>(ACCOUNTS_STORAGE_KEY, []);
      return cached.length > 0 ? cached : accounts;
    } catch {
      return getStored<Account[]>(ACCOUNTS_STORAGE_KEY, []);
    }
  },

  addAccount: async (b: {
    email_address: string;
    imap_host: string;
    imap_port: number;
    auth_type: string;
    app_password: string;
  }): Promise<Account> => {
    try {
      const acc = await req<Account>("/api/accounts", { method: "POST", body: JSON.stringify(b) });
      const current = getStored<Account[]>(ACCOUNTS_STORAGE_KEY, []);
      setStored(ACCOUNTS_STORAGE_KEY, [...current.filter((a) => a.id !== acc.id), acc]);
      return acc;
    } catch {
      const localAcc: Account = {
        id: `acc-${Date.now()}`,
        email_address: b.email_address,
        imap_host: b.imap_host,
        imap_port: b.imap_port,
        auth_type: b.auth_type,
        last_synced_at: null,
        last_seen_uid: 0,
      };
      const current = getStored<Account[]>(ACCOUNTS_STORAGE_KEY, []);
      setStored(ACCOUNTS_STORAGE_KEY, [...current, localAcc]);
      return localAcc;
    }
  },

  deleteAccount: async (id: string): Promise<void> => {
    const current = getStored<Account[]>(ACCOUNTS_STORAGE_KEY, []);
    setStored(ACCOUNTS_STORAGE_KEY, current.filter((a) => a.id !== id));
    try {
      await req<void>(`/api/accounts/${id}`, { method: "DELETE" });
    } catch {
      // deleted locally
    }
  },

  vapid: async (): Promise<{ publicKey: string }> => {
    const data = await req<{ public_key?: string; publicKey?: string }>("/api/push/vapid");
    return { publicKey: data.public_key ?? data.publicKey ?? "" };
  },

  subscribePush: (sub: object) =>
    req<void>("/api/push/subscribe", { method: "POST", body: JSON.stringify(sub) }),

  unsubscribePush: (endpoint: string) =>
    req<void>("/api/push/subscribe", {
      method: "DELETE",
      body: JSON.stringify({ endpoint }),
    }),

  calendarConnect: () => req<{ url: string }>("/api/calendar/connect"),

  calendarSync: async (): Promise<CalendarSyncResult> => {
    const data = await req<{ pushed?: number; updated?: number; removed?: number; synced?: number }>(
      "/api/calendar/sync",
      { method: "POST" },
    );
    const pushed = data.pushed ?? 0;
    const updated = data.updated ?? 0;
    const removed = data.removed ?? 0;
    const synced = data.synced ?? (pushed + updated + removed);
    return { pushed, updated, removed, synced };
  },

  chatHistory: async (): Promise<{ messages: ChatMessage[] }> => {
    const cachedKey = typeof localStorage !== "undefined" ? localStorage.getItem(GEMINI_KEY_STORAGE) : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cachedKey) {
      headers["x-gemini-key"] = cachedKey;
    }

    try {
      const data = await req<{ messages: ChatMessage[] }>("/api/chat/history", { headers });
      const msgs = data?.messages ?? [];
      if (msgs.length > 0) {
        setStored(CHAT_STORAGE_KEY, msgs);
        return { messages: msgs };
      }
      const local = getStored<ChatMessage[]>(CHAT_STORAGE_KEY, []);
      return { messages: local.length > 0 ? local : msgs };
    } catch {
      return { messages: getStored<ChatMessage[]>(CHAT_STORAGE_KEY, []) };
    }
  },

  chat: async (message: string): Promise<{ reply: string; proposed_action: ProposedAction | null }> => {
    const cachedKey = typeof localStorage !== "undefined" ? localStorage.getItem(GEMINI_KEY_STORAGE) : null;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cachedKey) {
      headers["x-gemini-key"] = cachedKey;
    }

    const currentMsgs = getStored<ChatMessage[]>(CHAT_STORAGE_KEY, []);
    const userMsg: ChatMessage = {
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setStored(CHAT_STORAGE_KEY, [...currentMsgs, userMsg]);

    const res = await req<{ reply: string; proposed_action: ProposedAction | null }>("/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ message }),
    });

    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: res.reply,
      created_at: new Date().toISOString(),
    };
    setStored(CHAT_STORAGE_KEY, [...getStored<ChatMessage[]>(CHAT_STORAGE_KEY, []), assistantMsg]);

    return res;
  },

  chatConfirm: async (action: ProposedAction): Promise<{ ok: boolean; task: Task }> => {
    const res = await req<{ ok: boolean; task: Task }>("/api/chat/confirm", {
      method: "POST",
      body: JSON.stringify({ action }),
    });
    if (res.task) {
      upsertLocalTask(res.task);
    }
    return res;
  },
};
