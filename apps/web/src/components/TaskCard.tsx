import { useState, useEffect } from "react";
import { api, Task } from "../lib/api.js";
import { appEvents } from "../lib/events.js";
import { fmtDate, fmtTime, hasTime, isOverdue, isToday } from "../lib/format.js";
import { parseSubtasks, serializeSubtasks } from "../lib/subtask.js";
import { PriorityPill } from "./PriorityPill.js";

export interface TaskCardProps {
  task: Task;
  onToggleDone: (task: Task) => void;
  onClick?: (task: Task) => void;
}

export function TaskCard({ task, onToggleDone, onClick }: TaskCardProps) {
  const [showAllSubtasks, setShowAllSubtasks] = useState(false);
  const [optimisticDescription, setOptimisticDescription] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticDescription(null);
    setShowAllSubtasks(false);
  }, [task.id, task.description]);

  const done = task.status === "done";
  const overdue = !done && isOverdue(task.due_date);

  const rawDescription = optimisticDescription !== null ? optimisticDescription : task.description;
  const { cleanDescription, subtasks, progressPercent, completedCount, totalCount } =
    parseSubtasks(rawDescription);

  const visibleSubtasks = showAllSubtasks ? subtasks : subtasks.slice(0, 3);

  const handleToggleSubtask = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    const updatedSubtasks = subtasks.map((st, i) =>
      i === index ? { ...st, completed: !st.completed } : st
    );
    const newDescription = serializeSubtasks(cleanDescription, updatedSubtasks);
    setOptimisticDescription(newDescription);
    try {
      await api.patchTask(task.id, { description: newDescription });
      appEvents.emit("tasks:changed");
    } catch (err) {
      setOptimisticDescription(null);
      console.error("Failed to update subtask:", err);
    }
  };

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Edit task: ${task.title}` : undefined}
      className="bg-card rounded-card shadow-card border border-border hover:border-accent/30 p-4 flex gap-3 cursor-pointer hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-accent/30"
      onClick={() => onClick?.(task)}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            onClick(task);
          }
        }
      }}
    >
      {/* Checkbox — real toggle button with role="checkbox" */}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`Mark "${task.title}" ${done ? "not done" : "done"}`}
        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 ${
          done
            ? "bg-accent border-accent"
            : "border-border hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(task);
        }}
      >
        {done && (
          <svg
            aria-hidden="true"
            focusable="false"
            className="w-3 h-3 text-white"
            fill="none"
            viewBox="0 0 12 12"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-sm font-medium leading-snug transition-colors ${
              done ? "line-through text-muted" : "text-text"
            }`}
          >
            {task.title}
          </p>
          <div className="flex-shrink-0">
            <PriorityPill priority={task.priority} />
          </div>
        </div>

        {cleanDescription && (
          <p className="text-xs text-sub line-clamp-2 mt-1">
            {cleanDescription}
          </p>
        )}

        {subtasks.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            {/* Progress indicator */}
            <div className="flex items-center justify-between text-xs text-sub">
              <span>
                {completedCount}/{totalCount} subtasks ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-border/50 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Interactive subtask checklist */}
            <div className="space-y-1 pt-1">
              {visibleSubtasks.map((st) => {
                const targetIndex = subtasks.findIndex((s) => s.id === st.id);
                return (
                  <div key={st.id} className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={st.completed}
                      aria-label={`Mark subtask "${st.title}" ${st.completed ? "incomplete" : "complete"}`}
                      className={`flex-shrink-0 w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                        st.completed
                          ? "bg-accent border-accent text-white"
                          : "border-border hover:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
                      }`}
                      onClick={(e) => void handleToggleSubtask(e, targetIndex)}
                    >
                      {st.completed && (
                        <svg
                          aria-hidden="true"
                          focusable="false"
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 12 12"
                        >
                          <path
                            d="M2 6l3 3 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                    <span
                      className={`truncate text-xs transition-colors ${
                        done || st.completed ? "line-through text-muted" : "text-sub"
                      }`}
                    >
                      {st.title}
                    </span>
                  </div>
                );
              })}

              {subtasks.length > 3 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllSubtasks((prev) => !prev);
                  }}
                  className="text-xs text-sub hover:text-accent font-medium mt-0.5 focus:outline-none transition-colors"
                  aria-expanded={showAllSubtasks}
                  aria-label={
                    showAllSubtasks
                      ? "Show fewer subtasks"
                      : `Show ${subtasks.length - 3} more subtasks`
                  }
                >
                  {showAllSubtasks ? "Show less" : `+${subtasks.length - 3} more`}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Metadata badges footer */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {task.due_date && (
            <span
              className={`text-xs inline-flex items-center gap-1 ${
                overdue
                  ? "text-danger font-medium"
                  : isToday(task.due_date)
                  ? "text-accent font-medium"
                  : "text-sub"
              }`}
            >
              {overdue && (
                <svg aria-hidden="true" focusable="false" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              )}
              {overdue ? "Overdue · " : ""}{fmtDate(task.due_date)}
            </span>
          )}
          {hasTime(task.due_date) && (
            <span className="text-xs inline-flex items-center gap-1 text-sub">
              <svg
                aria-hidden="true"
                focusable="false"
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {fmtTime(task.due_date)}
            </span>
          )}
          {task.created_via === "ai" && (
            <span className="text-xs text-muted border border-border rounded-pill px-1.5 py-0.5 font-medium">
              AI
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
