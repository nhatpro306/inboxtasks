import { useEffect, useState, useCallback } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { api } from "../lib/api.js";
import { Toast } from "./Toast.js";

function TodayIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="3" strokeLinecap="round" />
      <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
    </svg>
  );
}

function AllTasksIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="3" strokeLinecap="round" />
      <path d="M3 9h18M8 2v4M16 2v4M8 13h2M12 13h2M16 13h2M8 17h2M12 17h2" strokeLinecap="round" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" />
    </svg>
  );
}

interface CreateTaskModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateTaskModal({ onClose, onCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.createTask({ title: title.trim(), due_date: dueDate || null, priority });
      onCreated();
      onClose();
    } catch {
      setSaving(false);
    }
  }

  // Trap focus & close on Escape
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="new-task-title"
    >
      <div
        className="bg-card rounded-card shadow-card border border-border w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 id="new-task-title" className="text-base font-semibold mb-4">New Task</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label htmlFor="new-task-title-input" className="text-xs font-medium text-sub mb-1 block">
              Title
            </label>
            <input
              id="new-task-title-input"
              autoFocus
              className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="new-task-due" className="text-xs font-medium text-sub mb-1 block">
              Due date
            </label>
            <input
              id="new-task-due"
              type="date"
              className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="new-task-priority" className="text-xs font-medium text-sub mb-1 block">
              Priority
            </label>
            <select
              id="new-task-priority"
              className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={priority}
              onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 bg-accent text-white text-sm rounded-btn px-4 py-2 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Create task"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-sub border border-border rounded-btn px-4 py-2 hover:bg-bg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const navLinks = [
  { to: "/", label: "Today", Icon: TodayIcon },
  { to: "/all", label: "All Tasks", Icon: AllTasksIcon },
  { to: "/calendar", label: "Calendar", Icon: CalendarIcon },
  { to: "/review", label: "Review", Icon: ReviewIcon },
  { to: "/chat", label: "Chat", Icon: ChatIcon },
  { to: "/settings", label: "Settings", Icon: SettingsIcon },
];

export function AppShell() {
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [taskRefresh, setTaskRefresh] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  function showToast(msg: string) {
    setToast(msg);
  }

  // Synchronize search input with URL search param when on /all
  useEffect(() => {
    if (location.pathname === "/all") {
      const q = new URLSearchParams(location.search).get("q") ?? "";
      setSearchQuery(q);
    }
  }, [location.pathname, location.search]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/all?q=${encodeURIComponent(q)}` : "/all");
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchQuery(val);
    const q = val.trim();
    if (q) {
      navigate(`/all?q=${encodeURIComponent(q)}`, { replace: location.pathname === "/all" });
    } else if (location.pathname === "/all") {
      navigate("/all", { replace: true });
    }
  }

  function handleClearSearch() {
    setSearchQuery("");
    if (location.pathname === "/all") {
      navigate("/all", { replace: true });
    }
  }

  const fetchSuggestionCount = useCallback(async () => {
    try {
      const data = await api.suggestions();
      const count = Array.isArray(data)
        ? data.length
        : Array.isArray((data as any)?.suggestions)
        ? (data as any).suggestions.length
        : 0;
      setSuggestionCount(count);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void fetchSuggestionCount();
  }, [fetchSuggestionCount]);

  async function handleScanNow() {
    setScanning(true);
    try {
      if (typeof (api as any).ingestAll === "function") {
        await (api as any).ingestAll();
      } else {
        await api.scanNow();
      }
      showToast("Scan started — checking your inbox.");
      await fetchSuggestionCount();
      navigate("/review");
    } catch {
      showToast("Scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bg">
      {/* ─── DESKTOP: Left sidebar ─── */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-card border-r border-border min-h-screen">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div aria-hidden="true" className="w-8 h-8 rounded-btn bg-accent-tint text-accent grid place-items-center font-bold text-sm">
              IT
            </div>
            <span className="font-semibold text-text">InboxTasks</span>
          </div>
        </div>

        {/* New task button */}
        <div className="px-3 py-3">
          <button
            type="button"
            aria-label="Create new task"
            onClick={() => setShowNewTask(true)}
            className="w-full bg-accent text-white text-sm rounded-btn px-4 py-2 font-medium hover:bg-accent/90 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            New task
          </button>
        </div>

        {/* Nav */}
        <nav aria-label="Primary" className="flex-1 px-3 flex flex-col gap-0.5">
          {navLinks.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-btn text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent-tint text-accent"
                    : "text-sub hover:bg-bg hover:text-text"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? "text-accent" : ""} aria-hidden="true">
                    <Icon />
                  </span>
                  <span>{label}</span>
                  {label === "Review" && suggestionCount > 0 && (
                    <span
                      className="ml-auto bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium"
                      aria-label={`${suggestionCount > 9 ? "9+" : suggestionCount} pending suggestions`}
                    >
                      {suggestionCount > 9 ? "9+" : suggestionCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer status */}
        <div className="px-5 py-4 border-t border-border">
          <p className="text-xs text-muted">Local · Qwen3 8B</p>
        </div>
      </aside>

      {/* ─── DESKTOP: Main column (topbar + content) ─── */}
      <div className="hidden lg:flex flex-1 flex-col min-h-screen">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-6 py-3 flex items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm">
            <label htmlFor="global-search" className="sr-only">Search tasks</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted">
                <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <input
                id="global-search"
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                className="text-sm border border-border rounded-btn pl-9 pr-8 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-accent/30 bg-bg transition-colors"
                placeholder="Search tasks... (Enter)"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search query"
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-muted hover:text-text transition-colors"
                >
                  <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          </form>
          <button
            type="button"
            onClick={handleScanNow}
            disabled={scanning}
            aria-label={scanning ? "Scanning inbox…" : "Scan inbox now"}
            aria-busy={scanning}
            className="text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {scanning && (
              <svg aria-hidden="true" className="animate-spin h-3.5 w-3.5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span>{scanning ? "Scanning…" : "Scan now"}</span>
          </button>
          <div
            aria-label="User avatar"
            className="w-8 h-8 rounded-full bg-accent text-white grid place-items-center font-semibold text-sm flex-shrink-0"
          >
            U
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet context={{ taskRefresh }} />
        </main>
      </div>

      {/* ─── MOBILE ─── */}
      <div className="flex flex-col flex-1 lg:hidden">
        {/* Mobile top header */}
        <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div aria-hidden="true" className="w-7 h-7 rounded-btn bg-accent-tint text-accent grid place-items-center font-bold text-xs">
              IT
            </div>
            <span className="font-semibold text-text text-sm">InboxTasks</span>
          </div>
          <button
            type="button"
            onClick={handleScanNow}
            disabled={scanning}
            aria-label={scanning ? "Scanning inbox…" : "Scan inbox now"}
            aria-busy={scanning}
            className="text-xs bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {scanning && (
              <svg aria-hidden="true" className="animate-spin h-3 w-3 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            <span>{scanning ? "Scanning…" : "Scan now"}</span>
          </button>
        </header>

        {/* Mobile content */}
        <main className="flex-1 overflow-y-auto pb-20 px-4 py-4">
          <Outlet context={{ taskRefresh }} />
        </main>

        {/* Bottom tab bar */}
        <nav aria-label="Primary" className="fixed bottom-0 left-0 right-0 bg-card border-t border-border flex z-40">
          {navLinks.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors relative ${
                  isActive ? "text-accent" : "text-sub"
                }`
              }
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  <span aria-hidden="true" className={isActive ? "text-accent" : "text-muted"}>
                    <Icon />
                  </span>
                  <span aria-hidden="true" className="truncate max-w-full px-0.5">{label}</span>
                  {label === "Review" && suggestionCount > 0 && (
                    <span
                      className="absolute top-1 right-1/4 translate-x-2 bg-accent text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium"
                      aria-hidden="true"
                    >
                      {suggestionCount > 9 ? "9+" : suggestionCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* New task modal */}
      {showNewTask && (
        <CreateTaskModal
          onClose={() => setShowNewTask(false)}
          onCreated={() => setTaskRefresh((n) => n + 1)}
        />
      )}

      {/* Global toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
