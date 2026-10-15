import { useEffect, useState, useCallback, useRef } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { api, Task } from "../lib/api.js";
import { useAppEventListener, appEvents } from "../lib/events.js";
import { Toast } from "./Toast.js";
import { serializeSubtasks, parseSubtasks, SubtaskItem } from "../lib/subtask.js";
import { hasTime } from "../lib/format.js";
import { CommandPalette } from "./CommandPalette.js";
import {
  TodayIcon,
  AllTasksIcon,
  CalendarIcon,
  ReviewIcon,
  AnalyticsIcon,
  ChatIcon,
  SettingsIcon,
  BrandLogo,
  PlusIcon,
  SearchIcon,
  RefreshIcon,
  SpinnerIcon,
} from "./Icons.js";

interface CreateTaskModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateTaskModal({ onClose, onCreated }: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [saving, setSaving] = useState(false);

  function handleAddSubtask() {
    const trimmed = newSubtaskInput.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [...prev, trimmed]);
    setNewSubtaskInput("");
  }

  function handleSubtaskKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubtask();
    }
  }

  function handleRemoveSubtask(index: number) {
    setSubtasks((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      let due_date: string | null = null;
      if (dueDate) {
        if (dueTime) {
          const d = new Date(`${dueDate}T${dueTime}:00`);
          due_date = isNaN(d.getTime()) ? dueDate : d.toISOString();
        } else {
          due_date = dueDate;
        }
      }

      let description: string | undefined = undefined;
      if (subtasks.length > 0) {
        description = serializeSubtasks(
          "",
          subtasks.map((s, idx) => ({ id: `sub-${idx}`, title: s, completed: false }))
        );
      }

      await api.createTask({
        title: title.trim(),
        due_date,
        priority,
        description,
      });
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
        className="bg-card rounded-card shadow-card border border-border w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
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
          <div className="grid grid-cols-2 gap-3">
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
              <label htmlFor="new-task-time" className="text-xs font-medium text-sub mb-1 block">
                Time
              </label>
              <input
                id="new-task-time"
                type="time"
                className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
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
          <div>
            <label className="text-xs font-medium text-sub mb-1 block">
              Subtasks / Checklist
            </label>
            {subtasks.length > 0 && (
              <ul className="mb-2 flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                {subtasks.map((st, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-btn bg-bg text-sm border border-border/60"
                  >
                    <span className="truncate text-text text-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" aria-hidden="true" />
                      {st}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(idx)}
                      aria-label={`Remove subtask "${st}"`}
                      className="text-muted hover:text-danger p-0.5 rounded transition-colors text-xs font-semibold"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a subtask..."
                value={newSubtaskInput}
                onChange={(e) => setNewSubtaskInput(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                className="text-sm border border-border rounded-btn px-3 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-accent/30 bg-bg"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!newSubtaskInput.trim()}
                className="text-xs bg-accent-tint text-accent font-medium px-3 py-1.5 rounded-btn hover:bg-accent/20 disabled:opacity-40 transition-colors"
              >
                + Add
              </button>
            </div>
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

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onUpdated: (t: Task) => void;
  onDeleted: (id: string) => void;
}

function EditTaskModal({ task, onClose, onUpdated, onDeleted }: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const parsed = parseSubtasks(task.description);
  const [cleanDesc, setCleanDesc] = useState(parsed.cleanDescription);
  const [subtaskItems, setSubtaskItems] = useState<SubtaskItem[]>(parsed.subtasks);
  const [newSubtaskInput, setNewSubtaskInput] = useState("");

  const initialDueDate = task.due_date
    ? hasTime(task.due_date)
      ? (() => {
          const d = new Date(task.due_date);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        })()
      : task.due_date.slice(0, 10)
    : "";

  const initialDueTime =
    task.due_date && hasTime(task.due_date)
      ? (() => {
          const d = new Date(task.due_date);
          return isNaN(d.getTime())
            ? ""
            : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        })()
      : "";

  const [dueDate, setDueDate] = useState(initialDueDate);
  const [dueTime, setDueTime] = useState(initialDueTime);
  const [priority, setPriority] = useState<"low" | "medium" | "high">(task.priority);
  const [status, setStatus] = useState(task.status);
  const [saving, setSaving] = useState(false);

  function handleToggleSubtask(id: string) {
    setSubtaskItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item))
    );
  }

  function handleUpdateSubtaskTitle(id: string, newTitle: string) {
    setSubtaskItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: newTitle } : item))
    );
  }

  function handleRemoveSubtask(id: string) {
    setSubtaskItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleAddSubtask() {
    const trimmed = newSubtaskInput.trim();
    if (!trimmed) return;
    const newItem: SubtaskItem = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: trimmed,
      completed: false,
    };
    setSubtaskItems((prev) => [...prev, newItem]);
    setNewSubtaskInput("");
  }

  function handleSubtaskKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSubtask();
    }
  }

  const totalCount = subtaskItems.length;
  const completedCount = subtaskItems.filter((s) => s.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      let finalDueDate: string | null = null;
      if (dueDate) {
        if (dueTime) {
          const d = new Date(`${dueDate}T${dueTime}:00`);
          finalDueDate = isNaN(d.getTime()) ? dueDate : d.toISOString();
        } else {
          finalDueDate = dueDate;
        }
      }

      const finalDescription = serializeSubtasks(cleanDesc, subtaskItems);

      const updated = await api.patchTask(task.id, {
        title: title.trim(),
        description: finalDescription.trim() || null,
        due_date: finalDueDate,
        priority,
        status,
      });
      onUpdated(updated);
      onClose();
    } catch {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    try {
      await api.deleteTask(task.id);
      onDeleted(task.id);
      onClose();
    } catch {
      // ignore
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-edit-task-heading"
    >
      <div
        className="bg-card rounded-card shadow-card border border-border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="app-edit-task-heading" className="text-base font-semibold">Edit Task</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit modal"
            className="text-muted hover:text-text p-1 transition-colors"
          >
            <svg aria-hidden="true" focusable="false" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label htmlFor="app-edit-title" className="text-xs font-medium text-sub mb-1 block">Title</label>
            <input
              id="app-edit-title"
              autoFocus
              className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="app-edit-description" className="text-xs font-medium text-sub mb-1 block">Description</label>
            <textarea
              id="app-edit-description"
              className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
              rows={3}
              value={cleanDesc}
              onChange={(e) => setCleanDesc(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="app-edit-due" className="text-xs font-medium text-sub mb-1 block">Due date</label>
              <input
                id="app-edit-due"
                type="date"
                className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="app-edit-time" className="text-xs font-medium text-sub mb-1 block">Time</label>
              <input
                id="app-edit-time"
                type="time"
                className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="app-edit-priority" className="text-xs font-medium text-sub mb-1 block">Priority</label>
              <select
                id="app-edit-priority"
                className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label htmlFor="app-edit-status" className="text-xs font-medium text-sub mb-1 block">Status</label>
              <select
                id="app-edit-status"
                className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="accepted">Accepted</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {/* Subtasks Builder & Progress Section */}
          <div className="border-t border-border/60 pt-3 mt-1">
            <div className="flex items-center justify-between text-xs text-sub mb-1.5">
              <span className="font-medium text-text">Subtasks / Checklist</span>
              <span className="text-muted">
                {`${completedCount}/${totalCount} subtasks (${progressPercent}%)`}
              </span>
            </div>
            <div
              className="w-full bg-border/60 rounded-full h-1.5 overflow-hidden mb-3"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Subtasks completion progress"
            >
              <div
                className="bg-accent h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {subtaskItems.length > 0 && (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto mb-2 pr-0.5">
                {subtaskItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleToggleSubtask(item.id)}
                      className="rounded border-border text-accent focus:ring-accent/30 h-4 w-4 flex-shrink-0 cursor-pointer"
                      aria-label={`Toggle subtask ${item.title}`}
                    />
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => handleUpdateSubtaskTitle(item.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      className={`text-sm border border-border rounded-btn px-2.5 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-accent/30 bg-bg transition-colors ${
                        item.completed ? "line-through text-muted" : "text-text"
                      }`}
                      aria-label="Subtask title"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(item.id)}
                      aria-label={`Remove subtask "${item.title}"`}
                      className="text-muted hover:text-danger p-1 rounded transition-colors text-xs font-semibold flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a subtask..."
                value={newSubtaskInput}
                onChange={(e) => setNewSubtaskInput(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                className="text-sm border border-border rounded-btn px-3 py-1.5 flex-1 focus:outline-none focus:ring-2 focus:ring-accent/30 bg-bg"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                disabled={!newSubtaskInput.trim()}
                className="text-xs bg-accent-tint text-accent font-medium px-3 py-1.5 rounded-btn hover:bg-accent/20 disabled:opacity-40 transition-colors"
              >
                + Add
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-1">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 bg-accent text-white text-sm rounded-btn px-4 py-2 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="text-sm text-danger border border-danger/20 rounded-btn px-4 py-2 hover:bg-danger/5 transition-colors"
            >
              Delete
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
  { to: "/analytics", label: "Analytics", Icon: AnalyticsIcon },
  { to: "/chat", label: "Chat", Icon: ChatIcon },
  { to: "/settings", label: "Settings", Icon: SettingsIcon },
];

export function AppShell() {
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskRefresh, setTaskRefresh] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  const loadTasks = useCallback(async () => {
    try {
      const data = await api.listTasks();
      setTasks(data.filter((t) => t.status !== "dismissed"));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks, taskRefresh]);

  useAppEventListener("tasks:changed", loadTasks);

  const loadSuggestionsCount = useCallback(async () => {
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
    void loadSuggestionsCount();
  }, [loadSuggestionsCount]);

  useAppEventListener("suggestions:changed", loadSuggestionsCount);

  // Global keyboard shortcuts:
  // - Ctrl+K / Cmd+K: toggle command palette
  // - Ignore if target is INPUT, TEXTAREA, or SELECT (or contentEditable)
  // - Pressing 'n' or 'c': open setShowCreateModal(true)
  // - Pressing '/': prevent default, focus the desktop search input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tagName = target.tagName;
      if (
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      if (e.key === "n" || e.key === "c") {
        e.preventDefault();
        setShowCreateModal(true);
      } else if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleScanNow() {
    setScanning(true);
    try {
      if (typeof (api as any).ingestAll === "function") {
        await (api as any).ingestAll();
      } else {
        await api.scanNow();
      }
      showToast("Scan started — checking your inbox.");
      await loadSuggestionsCount();
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
        <div className="px-5 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BrandLogo className="w-7 h-7 flex-shrink-0" />
              <span className="font-bold text-base tracking-tight text-text">InboxTasks</span>
            </div>
            <span className="text-[10px] font-semibold bg-accent-tint text-accent border border-accent/20 px-1.5 py-0.5 rounded-pill">
              v0.1 Pro
            </span>
          </div>
        </div>

        {/* New task button */}
        <div className="px-3 py-3">
          <button
            type="button"
            aria-label="Create new task"
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-accent text-white text-sm rounded-btn px-4 py-2 font-medium hover:bg-accent/90 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <PlusIcon className="w-4 h-4" />
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
        <header className="glass-header sticky top-0 z-30 border-b border-border shadow-subtle px-6 py-3 flex items-center gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm">
            <label htmlFor="global-search" className="sr-only">Search tasks</label>
            <div className="relative flex items-center">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted">
                <SearchIcon className="w-4 h-4" />
              </span>
              <input
                ref={searchInputRef}
                id="global-search"
                type="search"
                value={searchQuery}
                onChange={handleSearchChange}
                className="text-sm border border-border rounded-btn pl-9 pr-24 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-accent/30 bg-bg transition-colors"
                placeholder="Search tasks... (Enter)"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1.5">
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search query"
                    onClick={handleClearSearch}
                    className="text-muted hover:text-text transition-colors p-0.5"
                  >
                    <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCommandPalette(true)}
                  aria-label="Open command palette"
                  title="Open Command Palette (Ctrl+K or ⌘K)"
                  className="px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted bg-card hover:bg-border/40 border border-border rounded shadow-xs transition-colors cursor-pointer flex items-center gap-0.5"
                >
                  <span>Ctrl+K</span>
                  <span className="text-muted/60">/</span>
                  <span>⌘K</span>
                </button>
              </div>
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
            {scanning ? (
              <SpinnerIcon className="w-3.5 h-3.5 text-accent" />
            ) : (
              <RefreshIcon className="w-3.5 h-3.5" />
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
        <header className="glass-header sticky top-0 z-30 border-b border-border shadow-subtle px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <BrandLogo className="w-6 h-6 flex-shrink-0" />
            <span className="font-bold text-text text-sm tracking-tight">InboxTasks</span>
            <span className="text-[9px] font-semibold bg-accent-tint text-accent border border-accent/20 px-1 py-0.5 rounded-pill">
              v0.1 Pro
            </span>
          </div>
          <button
            type="button"
            onClick={handleScanNow}
            disabled={scanning}
            aria-label={scanning ? "Scanning inbox…" : "Scan inbox now"}
            aria-busy={scanning}
            className="text-xs bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {scanning ? (
              <SpinnerIcon className="w-3 h-3 text-accent" />
            ) : (
              <RefreshIcon className="w-3 h-3" />
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

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        onOpenCreateTask={() => setShowCreateModal(true)}
        onScanInbox={handleScanNow}
        onSyncCalendar={async () => {
          await api.calendarSync();
          appEvents.emit("tasks:changed");
        }}
        tasks={tasks}
        onSelectTask={(task) => {
          setEditingTask(task);
        }}
      />

      {/* New task modal */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setTaskRefresh((n) => n + 1);
            appEvents.emit("tasks:changed");
          }}
        />
      )}

      {/* Edit task modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdated={() => {
            setTaskRefresh((n) => n + 1);
            appEvents.emit("tasks:changed");
          }}
          onDeleted={() => {
            setTaskRefresh((n) => n + 1);
            appEvents.emit("tasks:changed");
          }}
        />
      )}

      {/* Global toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
