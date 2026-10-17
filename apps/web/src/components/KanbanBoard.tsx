import { useState } from "react";
import type { Task } from "../lib/api.js";
import { fmtDate, fmtTime, hasTime, isOverdue, isToday } from "../lib/format.js";
import { parseSubtasks } from "../lib/subtask.js";
import { PriorityPill } from "./PriorityPill.js";
import {
  ClockIcon,
  CheckIcon,
  TimerIcon,
  MailReplyIcon,
  ArrowRightIcon,
  AlertCircleIcon,
} from "./Icons.js";

export interface KanbanBoardProps {
  tasks: Task[];
  onToggleDone: (task: Task) => void;
  onUpdateStatus: (taskId: string, newStatus: string) => void;
  onClickTask: (task: Task) => void;
  onStartFocus?: (task: Task) => void;
  onDraftReply?: (task: Task) => void;
}

interface ColumnConfig {
  id: "accepted" | "in_progress" | "done";
  title: string;
  badgeClass: string;
  headerBorderClass: string;
  pillClass: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: "accepted",
    title: "To Do",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    headerBorderClass: "border-blue-500/30",
    pillClass: "bg-blue-500 text-white",
  },
  {
    id: "in_progress",
    title: "In Progress",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    headerBorderClass: "border-amber-500/30",
    pillClass: "bg-amber-500 text-white",
  },
  {
    id: "done",
    title: "Completed",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    headerBorderClass: "border-emerald-500/30",
    pillClass: "bg-emerald-500 text-white",
  },
];

export function KanbanBoard({
  tasks,
  onToggleDone,
  onUpdateStatus,
  onClickTask,
  onStartFocus,
  onDraftReply,
}: KanbanBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Map tasks to columns; treat any unexpected or null status as 'accepted'
  const columnTasks: Record<ColumnConfig["id"], Task[]> = {
    accepted: [],
    in_progress: [],
    done: [],
  };

  for (const task of tasks) {
    if (task.status === "in_progress") {
      columnTasks.in_progress.push(task);
    } else if (task.status === "done") {
      columnTasks.done.push(task);
    } else {
      columnTasks.accepted.push(task);
    }
  }

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: ColumnConfig["id"]) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (taskId) {
      onUpdateStatus(taskId, targetColumnId);
    }
    setDraggedTaskId(null);
  };

  const getAdjacentColumns = (currentId: ColumnConfig["id"]) => {
    const colIds: ColumnConfig["id"][] = ["accepted", "in_progress", "done"];
    const idx = colIds.indexOf(currentId);
    return {
      prev: idx > 0 ? colIds[idx - 1] : null,
      next: idx < colIds.length - 1 ? colIds[idx + 1] : null,
    };
  };

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start pb-8"
      role="region"
      aria-label="Kanban board"
    >
      {COLUMNS.map((column) => {
        const items = columnTasks[column.id];
        const isTarget = dragOverColumn === column.id;

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
            className={`flex flex-col bg-surface/70 rounded-card border transition-all duration-200 min-h-[460px] p-3 ${
              isTarget
                ? "border-accent ring-2 ring-accent/30 bg-accent-subtle/60"
                : "border-border/80 shadow-xs"
            }`}
            role="region"
            aria-label={`${column.title} column`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/60 px-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${column.badgeClass}`}
                >
                  {column.title}
                </span>
                <span
                  className="text-xs font-medium text-sub bg-card px-2 py-0.5 rounded-full border border-border shadow-xs"
                  aria-label={`${items.length} tasks`}
                >
                  {items.length}
                </span>
              </div>
            </div>

            {/* Task Cards List */}
            <div className="flex flex-col gap-2.5 flex-1">
              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-border/70 rounded-card my-2 text-muted">
                  <p className="text-xs font-medium">No tasks</p>
                  <p className="text-[11px] text-muted/80 mt-0.5">Drag tasks here</p>
                </div>
              ) : (
                items.map((task) => {
                  const done = task.status === "done";
                  const overdue = !done && isOverdue(task.due_date);
                  const isDragging = draggedTaskId === task.id;
                  const { cleanDescription, subtasks, progressPercent, completedCount, totalCount } =
                    parseSubtasks(task.description);
                  const { prev, next } = getAdjacentColumns(column.id);

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest("button")) {
                          onClickTask(task);
                        }
                      }}
                      className={`group bg-card rounded-card shadow-card border border-border hover:border-accent/40 hover:shadow-card-hover transition-all duration-150 p-3.5 cursor-grab active:cursor-grabbing ${
                        isDragging ? "opacity-40 scale-[0.98] border-accent" : "opacity-100"
                      }`}
                      role="article"
                      aria-label={`Task: ${task.title}`}
                    >
                      {/* Top Row: Checkbox, Title, Priority */}
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

                      {/* Clean Description preview */}
                      {cleanDescription && (
                        <p className="text-[11px] text-sub line-clamp-2 mt-1.5 pl-6">
                          {cleanDescription}
                        </p>
                      )}

                      {/* Subtasks Progress Bar */}
                      {subtasks.length > 0 && (
                        <div className="mt-2.5 pl-6 space-y-1">
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

                      {/* Footer: Due date + Action buttons */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 text-xs gap-2">
                        {/* Due Date & Time */}
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

                        {/* Quick action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Focus Pomodoro Button */}
                          {onStartFocus && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartFocus(task);
                              }}
                              title="Start Focus Timer"
                              aria-label={`Start Pomodoro for "${task.title}"`}
                              className="p-1 rounded text-sub hover:text-accent hover:bg-accent-tint/60 transition-colors"
                            >
                              <TimerIcon className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Draft Reply Button (if email-linked) */}
                          {task.source_email_id && onDraftReply && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDraftReply(task);
                              }}
                              title="Draft Email Reply"
                              aria-label={`Draft reply for "${task.title}"`}
                              className="p-1 rounded text-sub hover:text-accent hover:bg-accent-tint/60 transition-colors"
                            >
                              <MailReplyIcon className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Quick Left Arrow */}
                          {prev && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(task.id, prev);
                              }}
                              title={`Move to ${prev === "accepted" ? "To Do" : "In Progress"}`}
                              aria-label={`Move "${task.title}" left`}
                              className="p-1 rounded text-sub hover:text-text hover:bg-border/60 transition-colors"
                            >
                              <ArrowRightIcon className="w-3 h-3 rotate-180" />
                            </button>
                          )}

                          {/* Quick Right Arrow */}
                          {next && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(task.id, next);
                              }}
                              title={`Move to ${next === "in_progress" ? "In Progress" : "Completed"}`}
                              aria-label={`Move "${task.title}" right`}
                              className="p-1 rounded text-sub hover:text-text hover:bg-border/60 transition-colors"
                            >
                              <ArrowRightIcon className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
