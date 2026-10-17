import { Task } from "./api.js";
import { isOverdue, isToday, parseLocalDate } from "./format.js";
import { parseSubtasks } from "./subtask.js";

export type QuadrantId = "do_first" | "schedule" | "delegate" | "dont_do";

export interface EisenhowerQuadrantInfo {
  id: QuadrantId;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const doFirstInfo: EisenhowerQuadrantInfo = {
  id: "do_first",
  title: "Do First",
  subtitle: "Urgent & Important",
  badge: "Q1",
  color: "text-danger",
  bgColor: "bg-danger/10",
  borderColor: "border-danger/30",
};

const scheduleInfo: EisenhowerQuadrantInfo = {
  id: "schedule",
  title: "Schedule",
  subtitle: "Important, Not Urgent",
  badge: "Q2",
  color: "text-accent",
  bgColor: "bg-accent-subtle",
  borderColor: "border-accent/30",
};

const delegateInfo: EisenhowerQuadrantInfo = {
  id: "delegate",
  title: "Delegate",
  subtitle: "Urgent, Not Important",
  badge: "Q3",
  color: "text-amber",
  bgColor: "bg-amber/10",
  borderColor: "border-amber/30",
};

const dontDoInfo: EisenhowerQuadrantInfo = {
  id: "dont_do",
  title: "Don't Do",
  subtitle: "Neither Urgent nor Important",
  badge: "Q4",
  color: "text-sub",
  bgColor: "bg-surface",
  borderColor: "border-border",
};

export type EisenhowerQuadrantsRecord = Record<QuadrantId, EisenhowerQuadrantInfo> &
  EisenhowerQuadrantInfo[];

export const EISENHOWER_QUADRANTS: EisenhowerQuadrantsRecord = Object.assign(
  [doFirstInfo, scheduleInfo, delegateInfo, dontDoInfo],
  {
    do_first: doFirstInfo,
    schedule: scheduleInfo,
    delegate: delegateInfo,
    dont_do: dontDoInfo,
  }
);

/**
 * Checks whether a task's due date is considered urgent.
 * Urgent if: overdue, due today, or due within 48 hours.
 */
export function isTaskUrgent(
  dueDate: string | null | undefined,
  referenceDate = new Date()
): boolean {
  if (!dueDate) return false;
  if (isOverdue(dueDate)) return true;
  if (isToday(dueDate)) return true;

  const due = parseLocalDate(dueDate);
  const diffMs = due.getTime() - referenceDate.getTime();
  if (diffMs > 0 && diffMs <= 48 * 60 * 60 * 1000) return true;

  const todayMidnight = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  ).getTime();
  const dueMidnight = new Date(
    due.getFullYear(),
    due.getMonth(),
    due.getDate()
  ).getTime();
  const dayDiff = (dueMidnight - todayMidnight) / (24 * 60 * 60 * 1000);
  return dayDiff > 0 && dayDiff <= 2;
}

/**
 * Checks whether a task is considered important.
 * Important if: high priority, or medium priority with due date or subtasks.
 */
export function isTaskImportant(task: Task): boolean {
  if (task.priority === "high") return true;
  if (task.priority === "medium") {
    const hasDueDate = Boolean(task.due_date);
    const hasSubtasks =
      (Array.isArray((task as any).subtasks) && (task as any).subtasks.length > 0) ||
      parseSubtasks(task.description).totalCount > 0;
    return hasDueDate || hasSubtasks;
  }
  return false;
}

/**
 * Categorizes tasks into the 4 Eisenhower Matrix quadrants:
 * - Q1 (do_first): Urgent & Important
 * - Q2 (schedule): Important, Not Urgent
 * - Q3 (delegate): Urgent, Not Important
 * - Q4 (dont_do): Neither Urgent nor Important
 */
export function categorizeEisenhower(
  tasks: Task[],
  referenceDate = new Date()
): Record<QuadrantId, Task[]> {
  const result: Record<QuadrantId, Task[]> = {
    do_first: [],
    schedule: [],
    delegate: [],
    dont_do: [],
  };

  for (const task of tasks) {
    const urgent = isTaskUrgent(task.due_date, referenceDate);
    const important = isTaskImportant(task);

    if (urgent && important) {
      result.do_first.push(task);
    } else if (!urgent && important) {
      result.schedule.push(task);
    } else if (urgent && !important) {
      result.delegate.push(task);
    } else {
      result.dont_do.push(task);
    }
  }

  return result;
}
