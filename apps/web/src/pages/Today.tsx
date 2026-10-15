import { useEffect, useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { api, Task } from "../lib/api.js";
import { TaskCard } from "../components/TaskCard.js";
import { TaskCardSkeleton } from "../components/Skeleton.js";
import { Toast } from "../components/Toast.js";
import { isOverdue, isToday } from "../lib/format.js";
import { useAppEventListener, appEvents } from "../lib/events.js";

interface EditTaskModalProps {
  task: Task;
  onClose: () => void;
  onUpdated: (t: Task) => void;
  onDeleted: (id: string) => void;
}

function EditTaskModal({ task, onClose, onUpdated, onDeleted }: EditTaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(task.priority);
  const [status, setStatus] = useState(task.status);
  const [saving, setSaving] = useState(false);

  async function handleSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const updated = await api.patchTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
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
              <option value="accepted">Accepted</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
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

export function Today() {
  const { taskRefresh } = useOutletContext<{ taskRefresh?: number }>() ?? {};
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listTasks();
      setTasks(data.filter((t) => t.status !== "suggested" && t.status !== "dismissed"));
    } catch {
      setError("Failed to load tasks. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useAppEventListener("tasks:changed", loadTasks);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks, taskRefresh]);

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

  const overdue = tasks.filter((t) => t.status !== "done" && isOverdue(t.due_date));
  const today = tasks.filter((t) => t.status !== "done" && isToday(t.due_date));
  const upcoming = tasks.filter(
    (t) =>
      t.status !== "done" &&
      !isOverdue(t.due_date) &&
      !isToday(t.due_date) &&
      t.due_date !== null,
  );
  const noDate = tasks.filter((t) => t.status !== "done" && t.due_date === null);
  const done = tasks.filter((t) => t.status === "done");

  if (loading) {
    return <TaskCardSkeleton count={3} />;
  }

  if (error) {
    return (
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
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold mb-5">Today</h1>

      {/* ─── Overdue Section ─── */}
      <section className="mb-6" aria-label="Overdue">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
          {overdue.length > 0 && <span className="w-2 h-2 rounded-full bg-danger animate-pulse" aria-hidden="true" />}
          <span className={overdue.length > 0 ? "text-danger" : ""}>Overdue</span>
          {overdue.length > 0 && (
            <span className="bg-danger/10 text-danger text-[10px] px-1.5 py-0.5 font-bold rounded-full">
              {overdue.length}
            </span>
          )}
        </h2>
        {overdue.length > 0 ? (
          <div className="flex flex-col gap-2">
            {overdue.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleDone={handleToggleDone}
                onClick={setEditingTask}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-green/20 bg-green/5 p-3 flex items-center gap-3 text-xs">
            <div className="w-5 h-5 rounded-full bg-green/15 text-green flex items-center justify-center font-bold text-xs flex-shrink-0" aria-hidden="true">
              ✓
            </div>
            <div>
              <p className="font-medium text-green">No overdue tasks</p>
              <p className="text-muted text-[11px]">Everything is on schedule. Great job staying ahead!</p>
            </div>
          </div>
        )}
      </section>

      {/* ─── Today Section ─── */}
      <section className="mb-6" aria-label="Today">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
          <span>Today</span>
          {today.length > 0 && (
            <span className="bg-accent-tint text-accent text-[10px] px-1.5 py-0.5 font-bold rounded-full">
              {today.length}
            </span>
          )}
        </h2>
        {today.length > 0 ? (
          <div className="flex flex-col gap-2">
            {today.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleDone={handleToggleDone}
                onClick={setEditingTask}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-accent/30 bg-accent-tint/30 p-6 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-accent-tint text-accent flex items-center justify-center mb-2.5" aria-hidden="true">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <rect x="3" y="4" width="18" height="18" rx="3" strokeLinecap="round" />
                <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-text">No tasks for today</p>
            <p className="text-xs text-muted mt-1 max-w-xs">
              Take a breather or schedule a new task to get things done.
            </p>
          </div>
        )}
      </section>

      {/* ─── Upcoming Section ─── */}
      <section className="mb-6" aria-label="Upcoming">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
          <span>Upcoming</span>
          {upcoming.length > 0 && (
            <span className="bg-sub/10 text-sub text-[10px] px-1.5 py-0.5 font-bold rounded-full">
              {upcoming.length}
            </span>
          )}
        </h2>
        {upcoming.length > 0 ? (
          <div className="flex flex-col gap-2">
            {upcoming.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleDone={handleToggleDone}
                onClick={setEditingTask}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-border/80 bg-card/60 p-4 flex items-center gap-3 text-xs">
            <div className="w-6 h-6 rounded-full bg-sub/10 text-sub flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-text">No upcoming tasks</p>
              <p className="text-muted text-[11px]">Tasks scheduled for future days will appear here.</p>
            </div>
          </div>
        )}
      </section>

      {/* ─── No Date Section (only when tasks exist) ─── */}
      {noDate.length > 0 && (
        <section className="mb-6" aria-label="No date">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
            <span>No date</span>
            <span className="bg-sub/10 text-sub text-[10px] px-1.5 py-0.5 font-bold rounded-full">
              {noDate.length}
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            {noDate.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleDone={handleToggleDone}
                onClick={setEditingTask}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─── Completed Section (only when tasks exist) ─── */}
      {done.length > 0 && (
        <section className="mb-6" aria-label="Done">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 flex items-center gap-1.5">
            <span>Completed</span>
            <span className="bg-sub/10 text-sub text-[10px] px-1.5 py-0.5 font-bold rounded-full">
              {done.length}
            </span>
          </h2>
          <div className="flex flex-col gap-2 opacity-80 hover:opacity-100 transition-opacity">
            {done.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleDone={handleToggleDone}
                onClick={setEditingTask}
              />
            ))}
          </div>
        </section>
      )}

      {/* Task Edit Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
