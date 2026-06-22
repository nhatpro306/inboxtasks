import { Task } from "../lib/api.js";
import { fmtDate, isOverdue } from "../lib/format.js";
import { PriorityPill } from "./PriorityPill.js";

interface Props {
  task: Task;
  onToggleDone: (task: Task) => void;
  onClick?: (task: Task) => void;
}

export function TaskCard({ task, onToggleDone, onClick }: Props) {
  const done = task.status === "done";
  const overdue = !done && isOverdue(task.due_date);

  return (
    <div
      className="bg-card rounded-card shadow-card border border-border p-4 flex gap-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(task)}
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
            : "border-border hover:border-accent"
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
            className={`text-sm font-medium leading-snug ${
              done ? "line-through text-muted" : "text-text"
            }`}
          >
            {task.title}
          </p>
          <PriorityPill priority={task.priority} />
        </div>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {task.due_date && (
            <span
              className={`text-xs ${overdue ? "text-danger font-medium" : "text-sub"}`}
            >
              {overdue ? "Overdue · " : ""}{fmtDate(task.due_date)}
            </span>
          )}
          {task.created_via === "ai" && (
            <span className="text-xs text-muted border border-border rounded-pill px-1.5 py-0.5">
              AI
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
