import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Task } from "../lib/api.js";
import { PriorityPill } from "./PriorityPill.js";
import { fmtDate } from "../lib/format.js";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateTask: () => void;
  onScanInbox: () => void;
  onSyncCalendar: () => void;
  tasks?: Task[];
  onSelectTask?: (task: Task) => void;
}

interface PaletteItem {
  id: string;
  section: "Actions" | "Navigation" | "Tasks";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  onSelect: () => void;
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M3 8V5a2 2 0 012-2h3M16 3h3a2 2 0 012 2v3M21 16v3a2 2 0 01-2 2h-3M8 21H5a2 2 0 01-2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 12h10M12 7v10" strokeLinecap="round" />
    </svg>
  );
}

function SyncIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TodayIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="3" strokeLinecap="round" />
      <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
    </svg>
  );
}

function ReviewIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="3" strokeLinecap="round" />
      <path d="M3 9h18M8 2v4M16 2v4M8 13h2M12 13h2M16 13h2M8 17h2M12 17h2" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" />
    </svg>
  );
}

function TaskCheckIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpenCreateTask,
  onScanInbox,
  onSyncCalendar,
  tasks = [],
  onSelectTask,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Reset state and focus on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Global escape listener when open
  useEffect(() => {
    if (!isOpen) return;
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen, onClose]);

  // Build filtered items
  const { actions, navigation, taskItems, allItems } = useMemo(() => {
    const q = query.trim().toLowerCase();

    // 1. Actions
    const rawActions: PaletteItem[] = [
      {
        id: "act-create",
        section: "Actions",
        title: "Create New Task",
        subtitle: "Open modal to add a new task",
        icon: <PlusIcon />,
        badge: <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg text-sub border border-border">Enter</kbd>,
        onSelect: () => {
          onClose();
          onOpenCreateTask();
        },
      },
      {
        id: "act-scan",
        section: "Actions",
        title: "Scan Inbox Now",
        subtitle: "Check connected inboxes for tasks",
        icon: <ScanIcon />,
        badge: <span className="text-[10px] text-muted">Inbox</span>,
        onSelect: () => {
          onClose();
          onScanInbox();
        },
      },
      {
        id: "act-sync",
        section: "Actions",
        title: "Sync Google Calendar",
        subtitle: "Push and pull events with Google Calendar",
        icon: <SyncIcon />,
        badge: <span className="text-[10px] text-muted">Calendar</span>,
        onSelect: () => {
          onClose();
          onSyncCalendar();
        },
      },
    ];

    const filteredActions = rawActions.filter(
      (item) =>
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q))
    );

    // 2. Navigation
    const rawNavigation: PaletteItem[] = [
      {
        id: "nav-today",
        section: "Navigation",
        title: "Go to Today",
        icon: <TodayIcon />,
        onSelect: () => {
          navigate("/today");
          onClose();
        },
      },
      {
        id: "nav-review",
        section: "Navigation",
        title: "Go to Review",
        icon: <ReviewIcon />,
        onSelect: () => {
          navigate("/review");
          onClose();
        },
      },
      {
        id: "nav-calendar",
        section: "Navigation",
        title: "Go to Calendar",
        icon: <CalendarIcon />,
        onSelect: () => {
          navigate("/calendar");
          onClose();
        },
      },
      {
        id: "nav-all",
        section: "Navigation",
        title: "Go to All Tasks",
        icon: <ListIcon />,
        onSelect: () => {
          navigate("/all");
          onClose();
        },
      },
      {
        id: "nav-analytics",
        section: "Navigation",
        title: "Go to Analytics",
        icon: <AnalyticsIcon />,
        onSelect: () => {
          navigate("/analytics");
          onClose();
        },
      },
      {
        id: "nav-chat",
        section: "Navigation",
        title: "Go to Chat",
        icon: <ChatIcon />,
        onSelect: () => {
          navigate("/chat");
          onClose();
        },
      },
      {
        id: "nav-settings",
        section: "Navigation",
        title: "Go to Settings",
        icon: <SettingsIcon />,
        onSelect: () => {
          navigate("/settings");
          onClose();
        },
      },
    ];

    const filteredNavigation = rawNavigation.filter(
      (item) => !q || item.title.toLowerCase().includes(q)
    );

    // 3. Tasks
    const matchingTasks = q
      ? tasks.filter((task) => task.title.toLowerCase().includes(q)).slice(0, 8)
      : tasks.slice(0, 5);

    const filteredTaskItems: PaletteItem[] = matchingTasks.map((task) => ({
      id: `task-${task.id}`,
      section: "Tasks",
      title: task.title,
      subtitle: task.due_date ? `Due ${fmtDate(task.due_date)}` : undefined,
      icon: <TaskCheckIcon />,
      badge: <PriorityPill priority={task.priority} />,
      onSelect: () => {
        onClose();
        onSelectTask?.(task);
      },
    }));

    const combined = [...filteredActions, ...filteredNavigation, ...filteredTaskItems];
    return {
      actions: filteredActions,
      navigation: filteredNavigation,
      taskItems: filteredTaskItems,
      allItems: combined,
    };
  }, [
    query,
    tasks,
    navigate,
    onClose,
    onOpenCreateTask,
    onScanInbox,
    onSyncCalendar,
    onSelectTask,
  ]);

  // Keep active index in bounds
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Auto scroll highlighted item into view
  useEffect(() => {
    const el = document.getElementById(`cmd-palette-item-${activeIndex}`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (allItems.length > 0) {
        setActiveIndex((prev) => (prev + 1) % allItems.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (allItems.length > 0) {
        setActiveIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[activeIndex]) {
        allItems[activeIndex].onSelect();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  }

  if (!isOpen) return null;

  let currentIndexTracker = 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-start justify-center pt-20 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div
        className="bg-card rounded-card shadow-card border border-border w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh] transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-border gap-3 flex-shrink-0">
          <svg aria-hidden="true" focusable="false" className="w-5 h-5 text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search tasks... (Esc to close)"
            className="w-full bg-transparent py-3.5 text-sm text-text placeholder:text-muted focus:outline-none"
            aria-label="Search commands or tasks"
          />
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-muted bg-bg border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-4 max-h-[60vh]">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              No matching commands or tasks found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {/* Actions Section */}
              {actions.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Actions
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    {actions.map((item) => {
                      const itemIndex = currentIndexTracker++;
                      const isSelected = activeIndex === itemIndex;
                      return (
                        <button
                          key={item.id}
                          id={`cmd-palette-item-${itemIndex}`}
                          type="button"
                          onClick={item.onSelect}
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-btn text-left transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-accent-tint text-accent font-medium"
                              : "text-text hover:bg-bg"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={isSelected ? "text-accent" : "text-sub"}>
                              {item.icon}
                            </span>
                            <div className="truncate">
                              <div>{item.title}</div>
                              {item.subtitle && (
                                <div className={`text-xs truncate ${isSelected ? "text-accent/80" : "text-muted"}`}>
                                  {item.subtitle}
                                </div>
                              )}
                            </div>
                          </div>
                          {item.badge && <div className="ml-2 flex-shrink-0">{item.badge}</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Navigation Section */}
              {navigation.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Navigation
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    {navigation.map((item) => {
                      const itemIndex = currentIndexTracker++;
                      const isSelected = activeIndex === itemIndex;
                      return (
                        <button
                          key={item.id}
                          id={`cmd-palette-item-${itemIndex}`}
                          type="button"
                          onClick={item.onSelect}
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-btn text-left transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-accent-tint text-accent font-medium"
                              : "text-text hover:bg-bg"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={isSelected ? "text-accent" : "text-sub"}>
                              {item.icon}
                            </span>
                            <span className="truncate">{item.title}</span>
                          </div>
                          <span className={`text-xs ${isSelected ? "text-accent/80" : "text-muted"}`}>
                            Jump to
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tasks Section */}
              {taskItems.length > 0 && (
                <div>
                  <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Tasks
                  </div>
                  <div className="space-y-0.5 mt-0.5">
                    {taskItems.map((item) => {
                      const itemIndex = currentIndexTracker++;
                      const isSelected = activeIndex === itemIndex;
                      return (
                        <button
                          key={item.id}
                          id={`cmd-palette-item-${itemIndex}`}
                          type="button"
                          onClick={item.onSelect}
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-btn text-left transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-accent-tint text-accent font-medium"
                              : "text-text hover:bg-bg"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={isSelected ? "text-accent" : "text-sub"}>
                              {item.icon}
                            </span>
                            <div className="truncate">
                              <div className="truncate">{item.title}</div>
                              {item.subtitle && (
                                <div className={`text-xs truncate ${isSelected ? "text-accent/80" : "text-muted"}`}>
                                  {item.subtitle}
                                </div>
                              )}
                            </div>
                          </div>
                          {item.badge && <div className="ml-2 flex-shrink-0">{item.badge}</div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-border bg-bg/50 flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono bg-card px-1 py-0.5 rounded border border-border">↑↓</kbd> Navigate</span>
            <span><kbd className="font-mono bg-card px-1 py-0.5 rounded border border-border">↵</kbd> Select</span>
            <span><kbd className="font-mono bg-card px-1 py-0.5 rounded border border-border">ESC</kbd> Close</span>
          </div>
          <span>{allItems.length} results</span>
        </div>
      </div>
    </div>
  );
}
