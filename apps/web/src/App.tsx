import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export function App() {
  const [health, setHealth] = useState<string>("checking…");

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) => setHealth(d.status === "ok" ? "API online" : "API error"))
      .catch(() => setHealth("API offline"));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-card rounded-card shadow-card border border-border p-8 max-w-sm w-full text-center">
        <div className="w-12 h-12 rounded-card bg-accent-tint text-accent grid place-items-center mx-auto mb-4 text-xl font-bold">
          IT
        </div>
        <h1 className="text-xl font-semibold mb-1">InboxTasks</h1>
        <p className="text-sub text-sm mb-5">Sprint 0 — foundations</p>
        <div className="inline-flex items-center gap-2 rounded-pill bg-accent-tint text-accent text-sm font-medium px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-green" />
          {health}
        </div>
        <p className="text-muted text-xs mt-5">Installable PWA · works offline</p>
      </div>
    </div>
  );
}
