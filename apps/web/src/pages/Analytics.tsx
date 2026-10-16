import { useEffect, useState, useCallback, useMemo } from "react";
import { api, Task } from "../lib/api.js";
import { parseSubtasks } from "../lib/subtask.js";
import { hasTime } from "../lib/format.js";
import { useAppEventListener } from "../lib/events.js";
import {
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  AnalyticsIcon,
  CheckIcon,
  CalendarIcon,
  RefreshIcon,
  SpinnerIcon,
} from "../components/Icons.js";

function UnscheduledIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  );
}

export function Analytics() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setError(null);
      const data = await api.listTasks();
      setTasks(data);
    } catch {
      setError("Failed to load tasks for analytics. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useAppEventListener("tasks:changed", () => void loadTasks());

  // Metrics computation
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "done").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
    const suggestedTasks = tasks.filter((t) => t.status === "suggested").length;

    const overallCompletionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    // Subtasks analytics across all tasks
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    let tasksWithSubtasksCount = 0;

    tasks.forEach((t) => {
      const parsed = parseSubtasks(t.description);
      if (parsed.totalCount > 0) {
        tasksWithSubtasksCount++;
      }
      totalSubtasks += parsed.totalCount;
      completedSubtasks += parsed.completedCount;
    });

    const subtaskCompletionRate =
      totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    const remainingSubtasks = totalSubtasks - completedSubtasks;

    // Priority distribution
    const highPriorityCount = tasks.filter((t) => t.priority === "high").length;
    const mediumPriorityCount = tasks.filter((t) => t.priority === "medium").length;
    const lowPriorityCount = tasks.filter((t) => t.priority === "low").length;

    const highPriorityPct = totalTasks > 0 ? Math.round((highPriorityCount / totalTasks) * 100) : 0;
    const mediumPriorityPct = totalTasks > 0 ? Math.round((mediumPriorityCount / totalTasks) * 100) : 0;
    const lowPriorityPct = totalTasks > 0 ? Math.round((lowPriorityCount / totalTasks) * 100) : 0;

    // Scheduled time distribution
    const specificTimeCount = tasks.filter((t) => t.due_date && hasTime(t.due_date)).length;
    const dateOnlyCount = tasks.filter((t) => t.due_date && !hasTime(t.due_date)).length;
    const noDateCount = tasks.filter((t) => !t.due_date).length;

    const specificTimePct = totalTasks > 0 ? Math.round((specificTimeCount / totalTasks) * 100) : 0;
    const dateOnlyPct = totalTasks > 0 ? Math.round((dateOnlyCount / totalTasks) * 100) : 0;
    const noDatePct = totalTasks > 0 ? Math.round((noDateCount / totalTasks) * 100) : 0;

    // Urgent active tasks (High priority and not done)
    const urgentActiveCount = tasks.filter((t) => t.priority === "high" && t.status !== "done").length;

    return {
      totalTasks,
      doneTasks,
      inProgressTasks,
      suggestedTasks,
      overallCompletionRate,
      totalSubtasks,
      completedSubtasks,
      remainingSubtasks,
      subtaskCompletionRate,
      tasksWithSubtasksCount,
      highPriorityCount,
      mediumPriorityCount,
      lowPriorityCount,
      highPriorityPct,
      mediumPriorityPct,
      lowPriorityPct,
      specificTimeCount,
      dateOnlyCount,
      noDateCount,
      specificTimePct,
      dateOnlyPct,
      noDatePct,
      urgentActiveCount,
    };
  }, [tasks]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Analytics</h1>
          <p className="text-sm text-sub mt-0.5">
            Performance metrics, checklist analytics, and schedule distribution.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadTasks(true)}
          disabled={refreshing || loading}
          aria-label="Refresh analytics data"
          className="self-start sm:self-auto inline-flex items-center gap-2 bg-card border border-border rounded-btn px-3.5 py-2 text-sm font-medium text-text hover:bg-bg transition-colors shadow-card disabled:opacity-50"
        >
          {refreshing ? (
            <SpinnerIcon className="w-4 h-4 text-sub" />
          ) : (
            <RefreshIcon className="w-4 h-4 text-sub" />
          )}
          <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-card p-4 flex items-center justify-between text-sm text-danger">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadTasks(true)}
            className="font-medium underline hover:text-danger/80"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-6 animate-pulse" role="status" aria-label="Loading analytics data">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-card border border-border p-5 h-28 shadow-card flex flex-col justify-between">
                <div className="h-4 bg-border/60 rounded w-1/2" />
                <div className="h-7 bg-border/80 rounded w-1/3" />
                <div className="h-3 bg-border/40 rounded w-2/3" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-card border border-border p-6 h-64 shadow-card" />
            <div className="bg-card rounded-card border border-border p-6 h-64 shadow-card" />
            <div className="bg-card rounded-card border border-border p-6 h-64 shadow-card" />
            <div className="bg-card rounded-card border border-border p-6 h-64 shadow-card" />
          </div>
        </div>
      ) : (
        <>
          {/* Top 4 Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Tasks */}
            <div className="bg-card rounded-card border border-border shadow-card p-5 flex flex-col justify-between hover:border-accent/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-sub">Total Tasks</span>
                <div className="w-9 h-9 rounded-btn bg-accent-tint text-accent flex items-center justify-center">
                  <AnalyticsIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-bold text-text">{stats.totalTasks}</div>
                <div className="text-xs text-muted mt-1">All recorded tasks</div>
              </div>
            </div>

            {/* Done Tasks */}
            <div className="bg-card rounded-card border border-border shadow-card p-5 flex flex-col justify-between hover:border-green/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-sub">Done Tasks</span>
                <div className="w-9 h-9 rounded-btn bg-green/10 text-green flex items-center justify-center">
                  <CheckCircleIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-bold text-text">{stats.doneTasks}</div>
                <div className="text-xs text-green font-medium mt-1">
                  {stats.overallCompletionRate}% completion rate
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-card rounded-card border border-border shadow-card p-5 flex flex-col justify-between hover:border-amber/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-sub">In Progress</span>
                <div className="w-9 h-9 rounded-btn bg-amber/10 text-amber flex items-center justify-center">
                  <ClockIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-bold text-text">{stats.inProgressTasks}</div>
                <div className="text-xs text-sub mt-1">Currently being worked on</div>
              </div>
            </div>

            {/* Suggested */}
            <div className="bg-card rounded-card border border-border shadow-card p-5 flex flex-col justify-between hover:border-accent/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-sub">Suggested</span>
                <div className="w-9 h-9 rounded-btn bg-accent-tint text-accent flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-bold text-text">{stats.suggestedTasks}</div>
                <div className="text-xs text-sub mt-1">Discovered from inboxes</div>
              </div>
            </div>
          </div>

          {/* Detailed Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Overall Task Completion */}
            <div className="bg-card rounded-card border border-border shadow-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-text">Overall Task Completion</h2>
                    <p className="text-xs text-sub">Percentage of total tasks completed</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-pill bg-accent-tint text-accent">
                    {stats.doneTasks} / {stats.totalTasks}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-4xl font-extrabold text-text">{stats.overallCompletionRate}%</span>
                  <span className="text-xs text-sub">overall progress</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-border rounded-full h-3 overflow-hidden">
                  <div
                    role="progressbar"
                    aria-valuenow={stats.overallCompletionRate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Overall task completion rate"
                    className="bg-accent h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.overallCompletionRate}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-6 border-t border-border mt-6 text-center">
                <div className="p-2 rounded-btn bg-bg">
                  <div className="text-xs text-sub">Done</div>
                  <div className="text-lg font-bold text-green mt-0.5">{stats.doneTasks}</div>
                </div>
                <div className="p-2 rounded-btn bg-bg">
                  <div className="text-xs text-sub">Active</div>
                  <div className="text-lg font-bold text-text mt-0.5">
                    {stats.totalTasks - stats.doneTasks}
                  </div>
                </div>
                <div className="p-2 rounded-btn bg-bg">
                  <div className="text-xs text-sub">In Progress</div>
                  <div className="text-lg font-bold text-amber mt-0.5">{stats.inProgressTasks}</div>
                </div>
              </div>
            </div>

            {/* 2. Subtasks Analytics */}
            <div className="bg-card rounded-card border border-border shadow-card p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-text">Subtasks Analytics</h2>
                    <p className="text-xs text-sub">Checklist items across all task descriptions</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-pill bg-green/10 text-green">
                    {stats.completedSubtasks} / {stats.totalSubtasks}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-4xl font-extrabold text-text">{stats.subtaskCompletionRate}%</span>
                  <span className="text-xs text-sub">subtasks completed</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-border rounded-full h-3 overflow-hidden">
                  <div
                    role="progressbar"
                    aria-valuenow={stats.subtaskCompletionRate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Subtask completion rate"
                    className="bg-green h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.subtaskCompletionRate}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-6 border-t border-border mt-6 text-center">
                <div className="p-2 rounded-btn bg-bg">
                  <div className="text-xs text-sub">Total Checklist</div>
                  <div className="text-lg font-bold text-text mt-0.5">{stats.totalSubtasks}</div>
                </div>
                <div className="p-2 rounded-btn bg-bg">
                  <div className="text-xs text-sub">Finished</div>
                  <div className="text-lg font-bold text-green mt-0.5">{stats.completedSubtasks}</div>
                </div>
                <div className="p-2 rounded-btn bg-bg">
                  <div className="text-xs text-sub">Remaining</div>
                  <div className="text-lg font-bold text-sub mt-0.5">{stats.remainingSubtasks}</div>
                </div>
              </div>
            </div>

            {/* 3. Priority Distribution */}
            <div className="bg-card rounded-card border border-border shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-text">Priority Distribution</h2>
                  <p className="text-xs text-sub">Task volume partitioned by priority</p>
                </div>
              </div>

              {/* Multi-segment stacked ratio bar */}
              <div className="w-full bg-border rounded-full h-3.5 overflow-hidden flex mb-5" aria-hidden="true">
                {stats.totalTasks === 0 ? (
                  <div className="w-full bg-border" />
                ) : (
                  <>
                    <div
                      className="bg-danger h-full transition-all"
                      style={{ width: `${(stats.highPriorityCount / stats.totalTasks) * 100}%` }}
                      title={`High: ${stats.highPriorityCount}`}
                    />
                    <div
                      className="bg-amber h-full transition-all"
                      style={{ width: `${(stats.mediumPriorityCount / stats.totalTasks) * 100}%` }}
                      title={`Medium: ${stats.mediumPriorityCount}`}
                    />
                    <div
                      className="bg-green h-full transition-all"
                      style={{ width: `${(stats.lowPriorityCount / stats.totalTasks) * 100}%` }}
                      title={`Low: ${stats.lowPriorityCount}`}
                    />
                  </>
                )}
              </div>

              {/* Rows */}
              <div className="space-y-3.5">
                {/* High Priority */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2 font-medium text-text">
                      <span className="w-2 h-2 rounded-full bg-danger" aria-hidden="true" />
                      High Priority
                    </span>
                    <span className="text-sub font-medium">
                      {stats.highPriorityCount} ({stats.highPriorityPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div
                      role="progressbar"
                      aria-valuenow={stats.highPriorityPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="High priority proportion"
                      className="bg-danger h-full rounded-full transition-all duration-300"
                      style={{ width: `${stats.highPriorityPct}%` }}
                    />
                  </div>
                </div>

                {/* Medium Priority */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2 font-medium text-text">
                      <span className="w-2 h-2 rounded-full bg-amber" aria-hidden="true" />
                      Medium Priority
                    </span>
                    <span className="text-sub font-medium">
                      {stats.mediumPriorityCount} ({stats.mediumPriorityPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div
                      role="progressbar"
                      aria-valuenow={stats.mediumPriorityPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Medium priority proportion"
                      className="bg-amber h-full rounded-full transition-all duration-300"
                      style={{ width: `${stats.mediumPriorityPct}%` }}
                    />
                  </div>
                </div>

                {/* Low Priority */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2 font-medium text-text">
                      <span className="w-2 h-2 rounded-full bg-green" aria-hidden="true" />
                      Low Priority
                    </span>
                    <span className="text-sub font-medium">
                      {stats.lowPriorityCount} ({stats.lowPriorityPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div
                      role="progressbar"
                      aria-valuenow={stats.lowPriorityPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Low priority proportion"
                      className="bg-green h-full rounded-full transition-all duration-300"
                      style={{ width: `${stats.lowPriorityPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Scheduled Time Distribution */}
            <div className="bg-card rounded-card border border-border shadow-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-text">Scheduled Time Distribution</h2>
                  <p className="text-xs text-sub">Specific time vs date-only vs no date</p>
                </div>
              </div>

              {/* Multi-segment stacked ratio bar */}
              <div className="w-full bg-border rounded-full h-3.5 overflow-hidden flex mb-5" aria-hidden="true">
                {stats.totalTasks === 0 ? (
                  <div className="w-full bg-border" />
                ) : (
                  <>
                    <div
                      className="bg-accent h-full transition-all"
                      style={{ width: `${(stats.specificTimeCount / stats.totalTasks) * 100}%` }}
                      title={`Specific Time: ${stats.specificTimeCount}`}
                    />
                    <div
                      className="bg-amber h-full transition-all"
                      style={{ width: `${(stats.dateOnlyCount / stats.totalTasks) * 100}%` }}
                      title={`Date Only: ${stats.dateOnlyCount}`}
                    />
                    <div
                      className="bg-border h-full transition-all"
                      style={{ width: `${(stats.noDateCount / stats.totalTasks) * 100}%` }}
                      title={`No Date: ${stats.noDateCount}`}
                    />
                  </>
                )}
              </div>

              {/* Breakdown rows */}
              <div className="space-y-3.5">
                {/* Specific Time */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2 font-medium text-text">
                      <ClockIcon className="w-4 h-4 text-accent" />
                      Specific Time
                    </span>
                    <span className="text-sub font-medium">
                      {stats.specificTimeCount} ({stats.specificTimePct}%)
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div
                      role="progressbar"
                      aria-valuenow={stats.specificTimePct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Specific time proportion"
                      className="bg-accent h-full rounded-full transition-all duration-300"
                      style={{ width: `${stats.specificTimePct}%` }}
                    />
                  </div>
                </div>

                {/* Date Only */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2 font-medium text-text">
                      <CalendarIcon className="w-4 h-4 text-amber" />
                      Date Only
                    </span>
                    <span className="text-sub font-medium">
                      {stats.dateOnlyCount} ({stats.dateOnlyPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div
                      role="progressbar"
                      aria-valuenow={stats.dateOnlyPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Date only proportion"
                      className="bg-amber h-full rounded-full transition-all duration-300"
                      style={{ width: `${stats.dateOnlyPct}%` }}
                    />
                  </div>
                </div>

                {/* No Date */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2 font-medium text-text">
                      <UnscheduledIcon />
                      No Date
                    </span>
                    <span className="text-sub font-medium">
                      {stats.noDateCount} ({stats.noDatePct}%)
                    </span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div
                      role="progressbar"
                      aria-valuenow={stats.noDatePct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="No date proportion"
                      className="bg-muted h-full rounded-full transition-all duration-300"
                      style={{ width: `${stats.noDatePct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Insights Banner */}
          <div className="bg-card rounded-card border border-border shadow-card p-5">
            <h3 className="text-sm font-semibold text-text mb-3">Productivity Insights</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-sub">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-green/10 text-green flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-medium text-text">
                    {stats.completedSubtasks} of {stats.totalSubtasks} checklist items
                  </span>{" "}
                  have been marked completed across all task details.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-amber/10 text-amber flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ClockIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-medium text-text">
                    {stats.specificTimeCount + stats.dateOnlyCount} scheduled tasks
                  </span>{" "}
                  ({stats.totalTasks > 0 ? Math.round(((stats.specificTimeCount + stats.dateOnlyCount) / stats.totalTasks) * 100) : 0}% of all tasks) have assigned deadlines.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-danger inline-block" />
                </div>
                <div>
                  <span className="font-medium text-text">
                    {stats.urgentActiveCount} high-priority tasks
                  </span>{" "}
                  currently require focus and attention.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
