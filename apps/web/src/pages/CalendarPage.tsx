import { useEffect, useRef, useState, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { api, Task } from "../lib/api.js";
import { fmtDay } from "../lib/format.js";
import { Toast } from "../components/Toast.js";

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

export function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
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
      date: t.due_date!,
      backgroundColor: PRIORITY_COLORS[t.priority] ?? "#5B5BD6",
      borderColor: "transparent",
      textColor: "#ffffff",
    }));

  function handleDateClick(info: DateClickArg) {
    setSelectedDate(info.dateStr);
  }

  function handleEventClick(info: EventClickArg) {
    setSelectedDate(info.event.startStr.split("T")[0]);
  }

  const dayTasks = selectedDate
    ? tasks.filter((t) => t.due_date && t.due_date.startsWith(selectedDate))
    : [];

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await api.calendarSync();
      setToast(`Synced ${res.synced} event${res.synced !== 1 ? "s" : ""}.`);
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Calendar</h1>
        {calendarConnected ? (
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={syncing}
            aria-label={syncing ? "Syncing calendar…" : "Sync Google Calendar"}
            className="text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
          >
            {syncing ? "Syncing…" : "Sync calendar"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleConnect()}
            aria-label="Connect Google Calendar"
            className="text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 transition-colors"
          >
            Connect Google Calendar
          </button>
        )}
      </div>

      {!calendarConnected && (
        <div role="note" className="mb-3 text-xs text-muted border border-border rounded-btn px-3 py-2 bg-card">
          Calendar not connected. Connect Google Calendar to sync events.
        </div>
      )}

      {/* FullCalendar */}
      <div className="bg-card rounded-card border border-border shadow-card overflow-hidden mb-5 [&_.fc-button]:!bg-accent [&_.fc-button]:!border-accent [&_.fc-button]:!text-white [&_.fc-button-active]:!bg-accent/80 [&_.fc-daygrid-day.fc-day-today]:!bg-accent-tint [&_.fc-daygrid-event]:!rounded [&_.fc-toolbar-title]:!text-base [&_.fc-toolbar-title]:!font-semibold">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
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
                  className="bg-card rounded-card border border-border p-3 flex items-center gap-3 shadow-card"
                >
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PRIORITY_COLORS[t.priority] }}
                  />
                  <span className="text-sm text-text">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
