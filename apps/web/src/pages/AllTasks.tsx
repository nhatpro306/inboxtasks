import { useEffect, useState, useCallback } from "react";
import { api, Task } from "../lib/api.js";
import { TaskCard } from "../components/TaskCard.js";
import { Toast } from "../components/Toast.js";

const STATUS_OPTIONS = [
  { label: "All", value: "" },
  { label: "Accepted", value: "accepted" },
  { label: "Done", value: "done" },
  { label: "Pending", value: "pending" },
];

interface EditPanelProps {
  task: Task;
  onClose: () => void;
  onUpdated: (t: Task) => void;
  onDeleted: (id: string) => void;
}

function EditPanel({ task, onClose, onUpdated, onDeleted }: EditPanelProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(task.priority);
  const [status, setStatus] = useState(task.status);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.patchTask(task.id, {
        title,
        description: description || null,
        due_date: dueDate || null,
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
      aria-labelledby="edit-task-heading"
    >
      <div
        className="bg-card rounded-card shadow-card border border-border w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="edit-task-heading" className="text-base font-semibold">Edit Task</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit panel"
            className="text-muted hover:text-text"
          >
            <svg aria-hidden="true" focusable="false" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="edit-title" className="text-xs font-medium text-sub mb-1 block">Title</label>
            <input
              id="edit-title"
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
          </div>
          <div>
            <label htmlFor="edit-status" className="text-xs font-medium text-sub mb-1 block">Status</label>
            <select
              id="edit-status"
              className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
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
        </div>
      </div>
    </div>
  );
}

export function AllTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Task | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function handleToggleDone(task: Task) {
    const newStatus = task.status === "done" ? "accepted" : "done";
    try {
      const updated = await api.patchTask(task.id, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
      setToast(newStatus === "done" ? "Task marked done." : "Task marked active.");
    } catch {
      setToast("Failed to update task.");
    }
  }

  const filtered = tasks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">All Tasks</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <label htmlFor="task-search" className="sr-only">Search tasks</label>
        <input
          id="task-search"
          type="search"
          placeholder="Search tasks…"
          className="text-sm border border-border rounded-btn px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-accent/30"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div role="group" aria-label="Filter by status" className="flex items-center gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              aria-pressed={statusFilter === opt.value}
              className={`text-sm px-3 py-1.5 rounded-btn font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-accent text-white"
                  : "text-sub border border-border hover:bg-bg"
              }`}
            >
              {opt.label}
            </button>
          ))}
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
          onUpdated={(t) => setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)))}
          onDeleted={(id) => setTasks((prev) => prev.filter((x) => x.id !== id))}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
