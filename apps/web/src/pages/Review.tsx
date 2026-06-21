import { useEffect, useState } from "react";
import { api, Suggestion } from "../lib/api.js";
import { SuggestionCard } from "../components/SuggestionCard.js";

export function Review() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  async function loadSuggestions() {
    try {
      const data = await api.suggestions();
      setSuggestions(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSuggestions();
  }, []);

  async function handleAccept(id: string) {
    try {
      await api.acceptTask(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    }
  }

  async function handleDismiss(id: string) {
    try {
      await api.dismissTask(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    }
  }

  async function handleEdit(id: string, patch: Partial<Suggestion>) {
    try {
      await api.patchTask(id, patch);
      await api.acceptTask(id);
      setSuggestions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // ignore
    }
  }

  async function handleScanNow() {
    setScanning(true);
    try {
      await api.scanNow();
      setLoading(true);
      await loadSuggestions();
    } catch {
      // ignore
    } finally {
      setScanning(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Review Suggestions</h1>
        <button
          onClick={handleScanNow}
          disabled={scanning}
          className="text-sm bg-accent-tint text-accent rounded-btn px-3 py-1.5 font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
        >
          {scanning ? "Scanning…" : "Scan now"}
        </button>
      </div>

      {loading ? (
        <div className="text-sub text-sm py-10 text-center">Loading…</div>
      ) : suggestions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-sub font-medium">No suggestions — you're all caught up.</p>
          <p className="text-muted text-sm mt-1">Scan your inbox to find new tasks.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              onAccept={() => handleAccept(s.id)}
              onDismiss={() => handleDismiss(s.id)}
              onEdit={(patch) => handleEdit(s.id, patch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
