import { useEffect, useState, useCallback } from "react";
import { api, Task } from "../lib/api.js";
import { TaskCard } from "../components/TaskCard.js";
import { Toast } from "../components/Toast.js";
import { isOverdue, isToday } from "../lib/format.js";

export function Today() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center py-20 text-sub text-sm">
        Loading…
      </div>
    );
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

  const isEmpty =
    overdue.length === 0 &&
    today.length === 0 &&
    upcoming.length === 0 &&
    noDate.length === 0 &&
    done.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div aria-hidden="true" className="text-4xl mb-3">✓</div>
        <p className="text-sub font-medium">All clear!</p>
        <p className="text-muted text-sm mt-1">No tasks yet. Scan your inbox or create a task.</p>
      </div>
    );
  }

  function Section({ title, items }: { title: string; items: Task[] }) {
    if (items.length === 0) return null;
    return (
      <section className="mb-6" aria-label={title}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">{title}</h2>
        <div className="flex flex-col gap-2">
          {items.map((task) => (
            <TaskCard key={task.id} task={task} onToggleDone={handleToggleDone} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">Today</h1>
      <Section title="Overdue" items={overdue} />
      <Section title="Today" items={today} />
      <Section title="Upcoming" items={upcoming} />
      <Section title="No date" items={noDate} />
      <Section title="Done" items={done} />
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
