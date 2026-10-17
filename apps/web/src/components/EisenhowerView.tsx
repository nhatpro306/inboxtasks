import type { Task } from "../lib/api.js";
import { fmtDate, fmtTime, hasTime, isOverdue, isToday } from "../lib/format.js";
import { parseSubtasks } from "../lib/subtask.js";
import { PriorityPill } from "./PriorityPill.js";
import {
  ClockIcon,
  CheckIcon,
  TimerIcon,
  AlertCircleIcon,
} from "./Icons.js";
import {
  categorizeEisenhower,
  EISENHOWER_QUADRANTS,
  type QuadrantId,
} from "../lib/eisenhower.js";

export interface EisenhowerViewProps {
  tasks: Task[];
  onToggleDone: (task: Task) => void;
  onClickTask: (task: Task) => void;
  onStartFocus?: (task: Task) => void;
}

const QUADRANT_KEYS: QuadrantId[] = ["do_first", "schedule", "delegate", "dont_do"];

const QUADRANT_THEMES: Record<
  QuadrantId,
  {
    borderClass: string;
    headerBg: string;
    badgeClass: string;
  }
> = {
  do_first: {
    borderClass: "border-rose-200 dark:border-rose-900/40",
    headerBg: "bg-rose-500/10 border-rose-500/20",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  },
  schedule: {
    borderClass: "border-indigo-200 dark:border-indigo-900/40",
    headerBg: "bg-indigo-500/10 border-indigo-500/20",
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  },
  delegate: {
    borderClass: "border-amber-200 dark:border-amber-900/40",
    headerBg: "bg-amber-500/10 border-amber-500/20",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  dont_do: {
    borderClass: "border-slate-200 dark:border-slate-800",
    headerBg: "bg-slate-500/10 border-slate-500/20",
    badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30",
  },
};

export function EisenhowerView({
  tasks,
  onToggleDone,
  onClickTask,
  onStartFocus,
}: EisenhowerViewProps) {
  const categorized = categorizeEisenhower(tasks);

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8"
      role="region"
      aria-label="Eisenhower Matrix View"
    >
      {QUADRANT_KEYS.map((quadrantKey) => {
        const info = EISENHOWER_QUADRANTS[quadrantKey];
        const theme = QUADRANT_THEMES[quadrantKey];
        const quadrantTasks = categorized[quadrantKey] || [];

        return (
          <section
            key={quadrantKey}
            className={`flex flex-col bg-card rounded-card border shadow-card overflow-hidden min-h-[380px] transition-all duration-200 ${theme.borderClass}`}
            aria-label={`${info.title} - ${info.subtitle}`}
          >
            {/* Quadrant Header */}
            <div className={`p-3.5 border-b flex items-center justify-between gap-2 ${theme.headerBg}`}>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${theme.badgeClass}`}
                  >
                    {info.badge} · {info.title}
                  </span>
                  <span
                    className="text-xs font-medium text-sub bg-card px-2 py-0.5 rounded-full border border-border shadow-xs"
                    aria-label={`${quadrantTasks.length} tasks`}
                  >
                    {quadrantTasks.length}
                  </span>
                </div>
                <p className="text-[11px] text-sub font-medium mt-1 pl-0.5">
                  {info.subtitle}
                </p>
              </div>
            </div>

            {/* Quadrant Task List */}
            <div className="p-3 flex flex-col gap-2.5 flex-1 overflow-y-auto max-h-[500px]">
              {quadrantTasks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border/60 rounded-card my-auto text-muted">
                  <p className="text-xs font-medium">No tasks in this quadrant</p>
                  <p className="text-[11px] text-muted/80 mt-0.5">
                    Tasks matching &quot;{info.subtitle}&quot; will appear here
                  </p>
                </div>
              ) : (
                quadrantTasks.map((task) => {
                  const done = task.status === "done";
                  const overdue = !done && isOverdue(task.due_date);
                  const { cleanDescription, subtasks, progressPercent, completedCount, totalCount } =
                    parseSubtasks(task.description);

                  return (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest("button")) {
                          onClickTask(task);
                        }
                      }}
                      className="group bg-surface hover:bg-card rounded-card border border-border hover:border-accent/40 shadow-xs hover:shadow-card transition-all duration-150 p-3 cursor-pointer"
                      role="article"
                      aria-label={`Task: ${task.title}`}
                    >
                      {/* Top: Checkbox, Title, Priority */}
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          aria-label={`Mark "${task.title}" ${done ? "incomplete" : "done"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleDone(task);
                          }}
                          className={`flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                            done
                              ? "bg-accent border-accent text-white"
                              : "border-border hover:border-accent focus:ring-2 focus:ring-accent/30"
                          }`}
                        >
                          {done && <CheckIcon className="w-2.5 h-2.5" strokeWidth={3} />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <h4
                            className={`text-xs font-semibold leading-snug break-words ${
                              done ? "line-through text-muted" : "text-text"
                            }`}
                          >
                            {task.title}
                          </h4>
                        </div>

                        <div className="flex-shrink-0">
                          <PriorityPill priority={task.priority} />
                        </div>
                      </div>

                      {/* Description preview */}
                      {cleanDescription && (
                        <p className="text-[11px] text-sub line-clamp-2 mt-1.5 pl-6">
                          {cleanDescription}
                        </p>
                      )}

                      {/* Subtasks Progress */}
                      {subtasks.length > 0 && (
                        <div className="mt-2 pl-6 space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-sub">
                            <span>
                              Subtasks ({completedCount}/{totalCount})
                            </span>
                            <span className="font-medium text-text">{progressPercent}%</span>
                          </div>
                          <div
                            className="w-full bg-border/60 rounded-full h-1 overflow-hidden"
                            role="progressbar"
                            aria-valuenow={progressPercent}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="bg-accent h-full rounded-full transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Footer: Due date + Focus Action */}
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50 text-xs gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          {task.due_date ? (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-medium truncate ${
                                overdue
                                  ? "text-danger"
                                  : isToday(task.due_date)
                                  ? "text-accent"
                                  : "text-sub"
                              }`}
                            >
                              {overdue ? (
                                <AlertCircleIcon className="w-3 h-3 flex-shrink-0" />
                              ) : (
                                <ClockIcon className="w-3 h-3 flex-shrink-0" />
                              )}
                              <span>{fmtDate(task.due_date)}</span>
                              {hasTime(task.due_date) && (
                                <span className="text-muted font-normal">
                                  {fmtTime(task.due_date)}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted italic">No due date</span>
                          )}
                        </div>

                        {onStartFocus && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartFocus(task);
                            }}
                            title="Start Pomodoro Focus"
                            aria-label={`Start Pomodoro for "${task.title}"`}
                            className="inline-flex items-center gap-1 text-[11px] text-sub hover:text-accent font-medium px-2 py-0.5 rounded-full hover:bg-accent-tint/60 transition-colors"
                          >
                            <TimerIcon className="w-3 h-3" />
                            <span>Focus</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
