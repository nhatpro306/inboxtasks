import { useEffect, useState, useCallback, useRef } from "react";
import { api, Suggestion } from "../lib/api.js";
import { SuggestionCard } from "../components/SuggestionCard.js";
import { SuggestionCardSkeleton } from "../components/Skeleton.js";
import { Toast, useToast } from "../components/Toast.js";
import { appEvents, useAppEventListener } from "../lib/events.js";
import {
  SparklesIcon,
  CheckIcon,
  TrashIcon,
  RefreshIcon,
  SpinnerIcon,
} from "../components/Icons.js";

export function Review() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const dismissedMapRef = useRef<Map<string, Suggestion>>(new Map());
  const { toast, toastAction, showToast, clearToast } = useToast();

  const loadSuggestions = useCallback(async () => {
    setError(null);
    try {
      const data = await api.suggestions();
      setSuggestions(data);
    } catch {
      setError("Failed to load suggestions. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useAppEventListener("suggestions:changed", loadSuggestions);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  async function handleAccept(id: string) {
    try {
      await api.acceptTask(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      showToast("Task accepted.");
      appEvents.emit("tasks:changed");
      appEvents.emit("suggestions:changed");
    } catch {
      showToast("Failed to accept task.");
    }
  }

  async function handleDismiss(id: string) {
    const item = suggestions.find((s) => s.id === id);
    if (item) {
      dismissedMapRef.current.set(id, item);
    }
    try {
      await api.dismissTask(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      appEvents.emit("suggestions:changed");
      showToast("Suggestion dismissed.", {
        label: "Undo",
        onClick: async () => {
          await api.patchTask(id, { status: "suggested" });
          await loadSuggestions();
          appEvents.emit("suggestions:changed");
        },
      });
    } catch {
      showToast("Failed to dismiss suggestion.");
    }
  }

  async function handleAcceptAll() {
    if (suggestions.length === 0 || batchProcessing) return;
    setBatchProcessing(true);
    try {
      const results = await Promise.allSettled(
        suggestions.map((s) => api.acceptTask(s.id))
      );
      const acceptedCount = results.filter((r) => r.status === "fulfilled").length;
      showToast(`Accepted ${acceptedCount} suggestion${acceptedCount === 1 ? "" : "s"}.`);
      appEvents.emit("tasks:changed");
      appEvents.emit("suggestions:changed");
      await loadSuggestions();
    } catch {
      showToast("Failed to accept suggestions.");
    } finally {
      setBatchProcessing(false);
    }
  }

  async function handleDismissAll() {
    if (suggestions.length === 0 || batchProcessing) return;
    setBatchProcessing(true);
    const toDismiss = [...suggestions];
    for (const s of toDismiss) {
      dismissedMapRef.current.set(s.id, s);
    }
    try {
      const results = await Promise.allSettled(
        toDismiss.map((s) => api.dismissTask(s.id))
      );
      const dismissedCount = results.filter((r) => r.status === "fulfilled").length;
      showToast(`Dismissed ${dismissedCount} suggestion${dismissedCount === 1 ? "" : "s"}.`, {
        label: "Undo",
        onClick: async () => {
          await Promise.allSettled(
            toDismiss.map((s) => api.patchTask(s.id, { status: "suggested" }))
          );
          await loadSuggestions();
          appEvents.emit("suggestions:changed");
        },
      });
      appEvents.emit("tasks:changed");
      appEvents.emit("suggestions:changed");
      await loadSuggestions();
    } catch {
      showToast("Failed to dismiss suggestions.");
    } finally {
      setBatchProcessing(false);
    }
  }

  async function handleEdit(id: string, patch: Partial<Suggestion>) {
    try {
      await api.patchTask(id, patch);
      await api.acceptTask(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      showToast("Task edited and accepted.");
      appEvents.emit("tasks:changed");
      appEvents.emit("suggestions:changed");
    } catch {
      showToast("Failed to save changes.");
    }
  }

  async function handleScanNow() {
    setScanning(true);
    try {
      await api.scanNow();
      showToast("Scan started — checking your inbox.");
      setLoading(true);
      await loadSuggestions();
      appEvents.emit("suggestions:changed");
    } catch {
      showToast("Scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Review Suggestions</h1>
        <div className="flex items-center gap-2">
          {suggestions.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => void handleAcceptAll()}
                disabled={scanning || batchProcessing}
                aria-label="Accept all suggestions"
                className="inline-flex items-center gap-1.5 text-sm bg-accent text-white rounded-btn px-3 py-1.5 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors shadow-sm"
              >
                <CheckIcon className="w-4 h-4" />
                <span>{batchProcessing ? "Processing…" : "Accept All"}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDismissAll()}
                disabled={scanning || batchProcessing}
                aria-label="Dismiss all suggestions"
                className="inline-flex items-center gap-1.5 text-sm border border-border text-sub rounded-btn px-3 py-1.5 font-medium hover:bg-bg disabled:opacity-50 transition-colors"
              >
                <TrashIcon className="w-4 h-4 text-muted" />
                <span>Dismiss All</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void handleScanNow()}
            disabled={scanning || batchProcessing}
            aria-label={scanning ? "Scanning inbox…" : "Scan inbox now"}
            className="inline-flex items-center gap-1.5 text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
          >
            {scanning ? (
              <SpinnerIcon className="w-4 h-4 text-accent" />
            ) : (
              <RefreshIcon className="w-4 h-4 text-accent" />
            )}
            <span>{scanning ? "Scanning…" : "Scan now"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <SuggestionCardSkeleton count={2} />
      ) : error ? (
        <div role="alert" className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <p className="text-danger text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadSuggestions();
            }}
            className="text-sm bg-accent text-white rounded-btn px-4 py-2 font-medium hover:bg-accent/90 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="bg-card rounded-card border border-border p-8 sm:p-10 shadow-card flex flex-col items-center justify-center text-center max-w-md mx-auto my-12">
          <div
            aria-hidden="true"
            className="w-14 h-14 rounded-full bg-accent-tint text-accent flex items-center justify-center mb-4 shadow-sm"
          >
            <SparklesIcon className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-text">All caught up</h2>
          <p className="text-sub font-medium mt-1">No suggestions — you're all caught up.</p>
          <p className="text-muted text-sm mt-1 mb-6">Scan your inbox to find new tasks.</p>
          <button
            type="button"
            onClick={() => void handleScanNow()}
            disabled={scanning || batchProcessing}
            aria-label={scanning ? "Scanning inbox…" : "Scan inbox now"}
            className="inline-flex items-center gap-2 text-sm bg-accent text-white rounded-btn px-4 py-2 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors shadow-sm"
          >
            {scanning ? (
              <SpinnerIcon className="w-4 h-4 text-white" />
            ) : (
              <RefreshIcon className="w-4 h-4 text-white" />
            )}
            <span>{scanning ? "Scanning inbox…" : "Scan inbox"}</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              onAccept={() => void handleAccept(s.id)}
              onDismiss={() => void handleDismiss(s.id)}
              onEdit={(patch) => void handleEdit(s.id, patch)}
            />
          ))}
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={clearToast} action={toastAction} />}
    </div>
  );
}
