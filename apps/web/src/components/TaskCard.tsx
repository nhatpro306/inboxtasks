import { Task } from "../lib/api.js";
import { fmtDate, isOverdue } from "../lib/format.js";
import { PriorityPill } from "./PriorityPill.js";

export interface TaskCardProps {
  task: Task;
  onToggleDone: (task: Task) => void;
  onClick?: (task: Task) => void;
}

export function TaskCard({ task, onToggleDone, onClick }: TaskCardProps) {
  const done = task.status === "done";
  const overdue = !done && isOverdue(task.due_date);

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

        {task.description && (
          <p className="text-xs text-sub line-clamp-2 mt-1">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {task.due_date && (
            <span
              className={`text-xs inline-flex items-center gap-1 ${
                overdue ? "text-danger font-medium" : "text-sub"
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
