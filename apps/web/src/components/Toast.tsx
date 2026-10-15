import { useState, useCallback, useEffect, useRef } from "react";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastProps {
  message: string;
  onDismiss: () => void;
  /** Duration in ms before auto-dismissal (default: 4000) */
  duration?: number;
  action?: ToastAction;
}

/**
 * Lightweight status toast.
 * Renders a fixed banner in the top-right corner.
 * Auto-dismisses after `duration` ms.
 */
export function Toast({ message, onDismiss, duration = 4000, action }: ToastProps) {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-50 flex items-center bg-text text-white text-sm px-4 py-2.5 rounded-btn shadow-card max-w-xs"
    >
      <span>{message}</span>
      {action && (
        <button
          type="button"
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
          className="ml-3 font-semibold text-accent-tint hover:underline focus:outline-none"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Hook to manage toast state.
 * Returns { toast, toastAction, showToast, clearToast } — render <Toast> when toast is non-null.
 */
export function useToast(defaultDuration = 4000) {
  const [toast, setToast] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<ToastAction | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
    setToastAction(undefined);
  }, []);

  const showToast = useCallback(
    (msg: string, action?: ToastAction) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setToast(msg);
      setToastAction(action);
      timerRef.current = setTimeout(() => {
        setToast(null);
        setToastAction(undefined);
      }, defaultDuration);
    },
    [defaultDuration],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { toast, toastAction, showToast, clearToast };
}
