import { useEffect, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { api, Task } from "../lib/api.js";
import { fmtDay, fmtTime, hasTime } from "../lib/format.js";
import { useAppEventListener, appEvents } from "../lib/events.js";
import { parseSubtasks, serializeSubtasks, SubtaskItem } from "../lib/subtask.js";
import { Toast } from "../components/Toast.js";
import {
  CalendarIcon,
  RefreshIcon,
  SpinnerIcon,
  CloseIcon,
  PlusIcon,
  TrashIcon,
} from "../components/Icons.js";

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-edit-task-heading"
    >
      <div
        className="bg-card rounded-card shadow-2xl border border-border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 id="calendar-edit-task-heading" className="text-base font-semibold">Edit Task</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit modal"
            className="text-muted hover:text-text p-1 transition-colors rounded-btn"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label htmlFor="cal-edit-title" className="text-xs font-medium text-sub mb-1 block">Title</label>
            <input
              id="cal-edit-title"
              autoFocus
              className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="cal-edit-description" className="text-xs font-medium text-sub mb-1 block">Description</label>
            <textarea
              id="cal-edit-description"
              className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
              rows={3}
              value={cleanDesc}
              onChange={(e) => setCleanDesc(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cal-edit-due" className="text-xs font-medium text-sub mb-1 block">Due date</label>
              <input
                id="cal-edit-due"
                type="date"
                className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="cal-edit-time" className="text-xs font-medium text-sub mb-1 block">Time</label>
              <input
                id="cal-edit-time"
                type="time"
                className="text-sm border border-border rounded-btn px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cal-edit-priority" className="text-xs font-medium text-sub mb-1 block">Priority</label>
              <select
                id="cal-edit-priority"
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
              <label htmlFor="cal-edit-status" className="text-xs font-medium text-sub mb-1 block">Status</label>
              <select
                id="cal-edit-status"
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
                      <CloseIcon className="w-3.5 h-3.5" />
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
                className="inline-flex items-center gap-1 text-xs bg-accent-tint text-accent font-medium px-3 py-1.5 rounded-btn hover:bg-accent/20 disabled:opacity-40 transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-4 pt-1">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 bg-accent text-white text-sm rounded-btn px-4 py-2 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors shadow-sm"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="inline-flex items-center justify-center gap-1.5 text-sm text-danger border border-danger/20 rounded-btn px-4 py-2 hover:bg-danger/5 transition-colors"
            >
              <TrashIcon className="w-4 h-4 text-danger" />
              <span>Delete</span>
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

export function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  const loadTasks = useCallback(async () => {
    try {
      const data = await api.listTasks();
      setTasks(data.filter((t) => t.due_date && t.status !== "dismissed"));
    } catch {
      setError("Failed to load tasks.");
    }
  }, []);

  useAppEventListener("tasks:changed", loadTasks);

  const loadSettings = useCallback(async () => {
    try {
      const s = await api.getSettings();
      setCalendarConnected(s.calendar_connected);
    } catch {
      // silently ignore — calendar button shows regardless
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadTasks(), loadSettings()]).finally(() => setLoading(false));
  }, [loadTasks, loadSettings]);

  const events: EventInput[] = tasks
    .filter((t) => t.due_date)
    .map((t) => ({
      id: t.id,
      title: t.title,
      start: t.due_date!,
      allDay: !hasTime(t.due_date),
      backgroundColor: PRIORITY_COLORS[t.priority] ?? "#5B5BD6",
      borderColor: "transparent",
      textColor: "#ffffff",
    }));

  function handleDateClick(info: DateClickArg) {
    setSelectedDate(info.dateStr);
  }

  function handleEventClick(info: EventClickArg) {
    info.jsEvent.preventDefault();
    const foundTask = tasks.find((t) => t.id === info.event.id);
    if (foundTask) {
      setEditingTask(foundTask);
    }
    if (info.event.startStr) {
      setSelectedDate(info.event.startStr.split("T")[0]);
    }
  }

  const dayTasks = selectedDate
    ? tasks.filter((t) => t.due_date && t.due_date.startsWith(selectedDate))
    : [];

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await api.calendarSync();
      setToast(`Synced ${res.synced} event${res.synced !== 1 ? "s" : ""}.`);
      await loadTasks();
      appEvents.emit("tasks:changed");
    } catch {
      setToast("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleConnect() {
    try {
      const res = await api.calendarConnect();
      window.location.href = res.url;
    } catch {
      setToast("Failed to initiate calendar connection.");
    }
  }

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
          onClick={() => { setError(null); setLoading(true); void Promise.all([loadTasks(), loadSettings()]).finally(() => setLoading(false)); }}
          className="text-sm bg-accent text-white rounded-btn px-4 py-2 font-medium hover:bg-accent/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <CalendarIcon className="w-5 h-5 text-accent" />
          <h1 className="text-lg font-semibold">Calendar</h1>
        </div>
        {calendarConnected ? (
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing}
            aria-label={syncing ? "Syncing calendar…" : "Sync Google Calendar"}
            className="inline-flex items-center gap-1.5 text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors shadow-sm"
          >
            {syncing ? (
              <SpinnerIcon className="w-4 h-4 text-accent" />
            ) : (
              <RefreshIcon className="w-4 h-4 text-accent" />
            )}
            <span>{syncing ? "Syncing…" : "Sync Google Calendar"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleConnect()}
            aria-label="Connect Google Calendar"
            className="inline-flex items-center gap-1.5 text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 transition-colors shadow-sm"
          >
            <RefreshIcon className="w-4 h-4 text-accent" />
            <span>Connect Google Calendar</span>
          </button>
        )}
      </div>

      {!calendarConnected && (
        <div role="note" className="mb-3 text-xs text-muted border border-border rounded-btn px-3 py-2 bg-card">
          Calendar not connected. Connect Google Calendar to sync events.
        </div>
      )}

      {/* FullCalendar */}
      <div className="bg-card rounded-card border border-border shadow-card overflow-hidden mb-5 [&_.fc-button]:!bg-accent [&_.fc-button]:!border-accent [&_.fc-button]:!text-white [&_.fc-button-active]:!bg-accent/80 [&_.fc-daygrid-day.fc-day-today]:!bg-accent-tint [&_.fc-daygrid-event]:!rounded [&_.fc-toolbar-title]:!text-base [&_.fc-toolbar-title]:!font-semibold [&_.fc-event]:!cursor-pointer [&_.fc-event-time]:!font-semibold [&_.fc-event-time]:!mr-1">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventTimeFormat={{
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short",
          }}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          height="auto"
        />
      </div>

      {/* Day tasks */}
      {selectedDate && (
        <section aria-label={`Tasks for ${fmtDay(selectedDate)}`}>
          <h2 className="text-sm font-semibold text-sub mb-2 uppercase tracking-wide">
            {fmtDay(selectedDate)}
          </h2>
          {dayTasks.length === 0 ? (
            <p className="text-sm text-muted">No tasks on this day.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {dayTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setEditingTask(t)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setEditingTask(t);
                    }
                  }}
                  aria-label={`Edit task ${t.title}`}
                  className="bg-card rounded-card border border-border p-3 flex items-center justify-between gap-3 shadow-card hover:border-accent/40 hover:bg-accent-tint/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PRIORITY_COLORS[t.priority] }}
                    />
                    <span className={`text-sm ${t.status === "done" ? "line-through text-muted" : "text-text"} truncate`}>
                      {t.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hasTime(t.due_date) && (
                      <span className="text-xs text-muted font-mono bg-bg px-2 py-0.5 rounded border border-border/50">
                        {fmtTime(t.due_date)}
                      </span>
                    )}
                    <span className="text-xs text-sub capitalize px-2 py-0.5 rounded-full bg-bg border border-border/60">
                      {t.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Edit task modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onUpdated={() => {
            void loadTasks();
            appEvents.emit("tasks:changed");
          }}
          onDeleted={() => {
            void loadTasks();
            appEvents.emit("tasks:changed");
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
