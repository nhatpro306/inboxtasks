import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api, Task } from "../lib/api.js";
import { TaskCard } from "../components/TaskCard.js";
import { Toast } from "../components/Toast.js";
import { useAppEventListener, appEvents } from "../lib/events.js";
import { hasTime } from "../lib/format.js";
import { parseSubtasks, serializeSubtasks, SubtaskItem } from "../lib/subtask.js";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Accepted", value: "accepted" },
  { label: "In Progress", value: "in_progress" },
  { label: "Done", value: "done" },
];

const PRIORITY_OPTIONS = [
  { label: "All", value: "" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

interface EditPanelProps {
  task: Task;
  onClose: () => void;
  onUpdated: (t: Task) => void;
  onDeleted: (id: string) => void;
}

export function EditPanel({ task, onClose, onUpdated, onDeleted }: EditPanelProps) {
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
      appEvents.emit("tasks:changed");
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
      appEvents.emit("tasks:changed");
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
      aria-labelledby="edit-task-heading"
    >
      <div
        className="bg-card rounded-card shadow-card border border-border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="edit-task-heading" className="text-base font-semibold">Edit Task</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit panel"
            className="text-muted hover:text-text p-1 transition-colors"
          >
            <svg aria-hidden="true" focusable="false" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label htmlFor="edit-title" className="text-xs font-medium text-sub mb-1 block">Title</label>
            <input
              id="edit-title"
              autoFocus
              className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="edit-description" className="text-xs font-medium text-sub mb-1 block">Description</label>
            <textarea
              id="edit-description"
              className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
              rows={3}
              value={cleanDesc}
              onChange={(e) => setCleanDesc(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-due" className="text-xs font-medium text-sub mb-1 block">Due date</label>
              <input
                id="edit-due"
                type="date"
                className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="edit-time" className="text-xs font-medium text-sub mb-1 block">Time</label>
              <input
                id="edit-time"
                type="time"
                className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-priority" className="text-xs font-medium text-sub mb-1 block">Priority</label>
              <select
                id="edit-priority"
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
              <label htmlFor="edit-status" className="text-xs font-medium text-sub mb-1 block">Status</label>
              <select
                id="edit-status"
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

export function AllTasks() {
  const [searchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") ?? "");
  const [priorityFilter, setPriorityFilter] = useState(() => searchParams.get("priority") ?? "");
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [editing, setEditing] = useState<Task | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q !== null) {
      setSearch(q);
    }
  }, [searchParams]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listTasks(statusFilter ? { status: statusFilter } : undefined);
      setTasks(data.filter((t) => t.status !== "suggested" && t.status !== "dismissed"));
    } catch {
      setError("Failed to load tasks. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useAppEventListener("tasks:changed", loadTasks);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function handleToggleDone(task: Task) {
    const newStatus = task.status === "done" ? "accepted" : "done";
    try {
      const updated = await api.patchTask(task.id, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      setToast(newStatus === "done" ? "Task marked done." : "Task marked active.");
      appEvents.emit("tasks:changed");
    } catch {
      setToast("Failed to update task.");
    }
  }

  function handleTaskUpdated(updated: Task) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setToast("Task updated.");
    appEvents.emit("tasks:changed");
  }

  function handleTaskDeleted(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setToast("Task deleted.");
    appEvents.emit("tasks:changed");
  }

  const filtered = tasks.filter((t) => {
    if (priorityFilter && t.priority !== priorityFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const matchTitle = t.title.toLowerCase().includes(q);
    const matchDesc = (t.description || "").toLowerCase().includes(q);
    return matchTitle || matchDesc;
  });

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">All Tasks</h1>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <label htmlFor="task-search" className="sr-only">Search tasks</label>
        <input
          id="task-search"
          type="search"
          placeholder="Search tasks…"
          className="text-sm border border-border rounded-btn px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-accent/30"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-4">
          <div role="group" aria-label="Filter by status" className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-sub mr-1">Status:</span>
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                aria-pressed={statusFilter === opt.value}
                className={`text-xs px-3 py-1.5 rounded-btn font-medium transition-colors ${
                  statusFilter === opt.value
                    ? "bg-accent text-white"
                    : "text-sub border border-border hover:bg-bg"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div role="group" aria-label="Filter by priority" className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-sub mr-1">Priority:</span>
            {PRIORITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPriorityFilter(opt.value)}
                aria-pressed={priorityFilter === opt.value}
                className={`text-xs px-3 py-1.5 rounded-btn font-medium transition-colors ${
                  priorityFilter === opt.value
                    ? "bg-accent text-white"
                    : "text-sub border border-border hover:bg-bg"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div role="status" aria-live="polite" className="text-sub text-sm py-10 text-center">
          Loading…
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <p className="text-danger text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={() => void loadTasks()}
            className="text-sm bg-accent text-white rounded-btn px-4 py-2 font-medium hover:bg-accent/90 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-sub text-sm py-10 text-center">No tasks found.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleDone={handleToggleDone}
              onClick={setEditing}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditPanel
          task={editing}
          onClose={() => setEditing(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
