import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import type { DateClickArg } from "@fullcalendar/interaction";
import { api, Task } from "../lib/api.js";
import { fmtDay } from "../lib/format.js";

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

export function CalendarPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);

  useEffect(() => {
    void loadTasks();
    void loadSettings();
  }, []);

  async function loadTasks() {
    try {
      const data = await api.listTasks();
      setTasks(data.filter((t) => t.due_date && t.status !== "dismissed"));
    } catch {
      // ignore
    }
  }

  async function loadSettings() {
    try {
      const s = await api.getSettings();
      setCalendarConnected(s.calendar_connected);
    } catch {
      // ignore
    }
  }

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
    setSyncMsg(null);
    try {
      const res = await api.calendarSync();
      setSyncMsg(`Synced ${res.synced} event${res.synced !== 1 ? "s" : ""}.`);
    } catch {
      setSyncMsg("Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleConnect() {
    try {
      const res = await api.calendarConnect();
      window.location.href = res.url;
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Calendar</h1>
        {calendarConnected ? (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
          >
            {syncing ? "Syncing…" : "Sync calendar"}
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 transition-colors"
          >
            Connect Google Calendar
          </button>
        )}
      </div>

      {syncMsg && (
        <div className="mb-3 text-sm text-sub border border-border rounded-btn px-3 py-2 bg-card">
          {syncMsg}
        </div>
      )}

      {!calendarConnected && (
        <div className="mb-3 text-xs text-muted border border-border rounded-btn px-3 py-2 bg-card">
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
        <div>
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
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PRIORITY_COLORS[t.priority] }}
                  />
                  <span className="text-sm text-text">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
