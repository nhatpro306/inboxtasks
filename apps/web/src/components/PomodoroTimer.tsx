import { useState, useEffect, useCallback } from "react";
import type { Task } from "../lib/api.js";
import { PriorityPill } from "./PriorityPill.js";
import {
  CloseIcon,
  PlayIcon,
  PauseIcon,
  RefreshIcon,
  CheckIcon,
  TimerIcon,
} from "./Icons.js";

export interface PomodoroTimerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleteTask: (task: Task) => void;
}

const DEFAULT_POMODORO_SECONDS = 25 * 60; // 1500 seconds

export function PomodoroTimer({
  task,
  isOpen,
  onClose,
  onCompleteTask,
}: PomodoroTimerProps) {
  const [timeLeft, setTimeLeft] = useState(DEFAULT_POMODORO_SECONDS);
  const [totalDuration, setTotalDuration] = useState(DEFAULT_POMODORO_SECONDS);
  const [isRunning, setIsRunning] = useState(false);

  // Reset timer whenever a new task is opened
  useEffect(() => {
    if (isOpen && task) {
      setTimeLeft(DEFAULT_POMODORO_SECONDS);
      setTotalDuration(DEFAULT_POMODORO_SECONDS);
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  }, [isOpen, task?.id]);

  // Countdown timer interval
  useEffect(() => {
    if (!isOpen || !isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isRunning]);

  // Handle ESC key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || !task) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // Circular progress calculation
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = totalDuration > 0 ? timeLeft / totalDuration : 0;
  const strokeDashoffset = circumference * (1 - progressRatio);

  const handleTogglePlay = () => {
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    setTimeLeft(DEFAULT_POMODORO_SECONDS);
    setTotalDuration(DEFAULT_POMODORO_SECONDS);
    setIsRunning(false);
  };

  const handleAddFiveMinutes = () => {
    setTimeLeft((prev) => prev + 300);
    setTotalDuration((prev) => prev + 300);
  };

  const handleMarkComplete = () => {
    onCompleteTask(task);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pomodoro-heading"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-card shadow-elevated border border-border w-full max-w-sm p-6 flex flex-col items-center relative animate-modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-border/60">
          <div className="flex items-center gap-2 text-accent">
            <TimerIcon className="w-5 h-5 text-accent" />
            <h2 id="pomodoro-heading" className="text-sm font-semibold text-text">
              Focus Pomodoro
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Pomodoro timer"
            className="text-muted hover:text-text p-1 rounded-full hover:bg-border/40 transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Current Task Details */}
        <div className="w-full bg-surface rounded-btn border border-border/70 p-3 mb-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <PriorityPill priority={task.priority} />
            <span className="text-[11px] text-muted uppercase tracking-wider font-semibold">
              Active Focus
            </span>
          </div>
          <h3 className="text-sm font-semibold text-text line-clamp-2 px-1">
            {task.title}
          </h3>
        </div>

        {/* Circular Progress Gauge */}
        <div className="relative flex items-center justify-center my-3">
          <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 160 160">
            {/* Background track circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-border/60"
            />
            {/* Active countdown progress circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-500 ease-linear ${
                timeLeft === 0
                  ? "text-emerald-500"
                  : isRunning
                  ? "text-accent"
                  : "text-amber-500"
              }`}
            />
          </svg>

          {/* Time text centered inside gauge */}
          <div className="absolute flex flex-col items-center justify-center">
            <span
              className="text-3xl font-mono font-bold tracking-tight text-text"
              aria-live="polite"
              aria-label={`${minutes} minutes and ${seconds} seconds remaining`}
            >
              {formattedTime}
            </span>
            <span
              className={`text-[11px] font-semibold tracking-wider uppercase mt-1 px-2 py-0.5 rounded-full ${
                timeLeft === 0
                  ? "bg-emerald-500/10 text-emerald-600"
                  : isRunning
                  ? "bg-accent-tint text-accent"
                  : "bg-amber-500/10 text-amber-600"
              }`}
            >
              {timeLeft === 0 ? "Completed!" : isRunning ? "Focusing" : "Paused"}
            </span>
          </div>
        </div>

        {/* Timer Control Buttons */}
        <div className="flex items-center justify-center gap-3 mt-4 mb-5">
          {/* Reset button */}
          <button
            type="button"
            onClick={handleReset}
            title="Reset to 25 min"
            aria-label="Reset timer"
            className="p-2.5 rounded-full border border-border text-sub hover:text-text hover:bg-surface transition-colors"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>

          {/* Play/Pause main button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label={isRunning ? "Pause focus timer" : "Start focus timer"}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-accent text-white shadow-card hover:bg-accent-hover active:bg-accent-active transition-all transform active:scale-95"
          >
            {isRunning ? (
              <PauseIcon className="w-5 h-5 fill-white text-white" />
            ) : (
              <PlayIcon className="w-5 h-5 fill-white text-white translate-x-0.5" />
            )}
          </button>

          {/* +5 min extension button */}
          <button
            type="button"
            onClick={handleAddFiveMinutes}
            title="Add 5 minutes"
            aria-label="Add 5 minutes to timer"
            className="px-2.5 py-1.5 rounded-full border border-border text-sub hover:text-text hover:bg-surface text-xs font-semibold transition-colors"
          >
            +5m
          </button>
        </div>

        {/* Mark Task Complete Button */}
        <button
          type="button"
          onClick={handleMarkComplete}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-btn py-2.5 px-4 shadow-xs transition-colors"
        >
          <CheckIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
          <span>Mark Task Complete</span>
        </button>
      </div>
    </div>
  );
}
