import { useEffect, useState, useCallback } from "react";
import { api, Suggestion } from "../lib/api.js";
import { SuggestionCard } from "../components/SuggestionCard.js";
import { Toast } from "../components/Toast.js";

export function Review() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
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

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  async function handleAccept(id: string) {
    try {
      await api.acceptTask(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      setToast("Task accepted.");
    } catch {
      setToast("Failed to accept task.");
    }
  }

  async function handleDismiss(id: string) {
    try {
      await api.dismissTask(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      setToast("Suggestion dismissed.");
    } catch {
      setToast("Failed to dismiss suggestion.");
    }
  }

  async function handleEdit(id: string, patch: Partial<Suggestion>) {
    try {
      await api.patchTask(id, patch);
      await api.acceptTask(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      setToast("Task edited and accepted.");
    } catch {
      setToast("Failed to save changes.");
    }
  }

  async function handleScanNow() {
    setScanning(true);
    try {
      await api.scanNow();
      setToast("Scan started — checking your inbox.");
      setLoading(true);
      await loadSuggestions();
    } catch {
      setToast("Scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Review Suggestions</h1>
        <button
          type="button"
          onClick={() => void handleScanNow()}
          disabled={scanning}
          aria-label={scanning ? "Scanning inbox…" : "Scan inbox now"}
          className="text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
        >
          {scanning ? "Scanning…" : "Scan now"}
        </button>
      </div>

      {loading ? (
        <div role="status" aria-live="polite" className="text-sub text-sm py-10 text-center">
          Loading…
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <p className="text-danger text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={() => void loadSuggestions()}
            className="text-sm bg-accent text-white rounded-btn px-4 py-2 font-medium hover:bg-accent/90 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div aria-hidden="true" className="text-4xl mb-3">🎉</div>
          <p className="text-sub font-medium">No suggestions — you're all caught up.</p>
          <p className="text-muted text-sm mt-1">Scan your inbox to find new tasks.</p>
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

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
