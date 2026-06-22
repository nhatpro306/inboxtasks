import { useEffect } from "react";

interface ToastProps {
  message: string;
  onDismiss: () => void;
  /** Duration in ms before auto-dismissal (default: 4000) */
  duration?: number;
}

/**
 * Lightweight status toast.
 * Renders a fixed banner in the top-right corner.
 * Auto-dismisses after `duration` ms.
 */
export function Toast({ message, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-4 right-4 z-50 bg-text text-white text-sm px-4 py-2.5 rounded-btn shadow-card max-w-xs"
    >
      {message}
    </div>
  );
}

/**
 * Hook to manage toast state.
 * Returns [toastMsg, showToast] — render <Toast> when toastMsg is non-null.
 */
import { useState, useCallback } from "react";

export function useToast(defaultDuration = 4000) {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback(
    (msg: string) => {
      setToast(msg);
      setTimeout(() => setToast(null), defaultDuration);
    },
    [defaultDuration],
  );
  const clearToast = useCallback(() => setToast(null), []);
  return { toast, showToast, clearToast };
}
