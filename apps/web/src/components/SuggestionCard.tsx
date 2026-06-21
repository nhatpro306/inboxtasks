import { useState } from "react";
import { Suggestion } from "../lib/api.js";
import { fmtDate } from "../lib/format.js";
import { PriorityPill } from "./PriorityPill.js";

interface Props {
  s: Suggestion;
  onAccept: () => void;
  onDismiss: () => void;
  onEdit: (patch: Partial<Suggestion>) => void;
}

export function SuggestionCard({ s, onAccept, onDismiss, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(s.title);
  const [dueDate, setDueDate] = useState(s.due_date ?? "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(s.priority);

  function handleEdit() {
    onEdit({ title, due_date: dueDate || null, priority });
    setEditing(false);
  }

  return (
    <div className="bg-card rounded-card shadow-card border border-border p-4 flex flex-col gap-3">
      {/* Source */}
      {s.source_email && (
        <div className="text-xs text-sub">
          <span className="font-medium text-text">{s.source_email.from}</span>
          {s.source_email.subject && (
            <span className="text-muted"> · {s.source_email.subject}</span>
          )}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-text leading-snug">{s.title}</p>
        <span className="inline-flex items-center rounded-pill bg-accent-tint text-accent text-xs font-medium px-2 py-0.5 flex-shrink-0">
          {Math.round(s.match * 100)}% match
        </span>
      </div>

      {/* Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <PriorityPill priority={s.priority} />
        {s.due_date && (
          <span className="text-xs text-sub">{fmtDate(s.due_date)}</span>
        )}
      </div>

      {/* Inline edit form */}
      {editing && (
        <div className="border-t border-border pt-3 flex flex-col gap-2">
          <input
            className="text-sm border border-border rounded-btn px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
          <input
            type="date"
            className="text-sm border border-border rounded-btn px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <select
            className="text-sm border border-border rounded-btn px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
            value={priority}
            onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="flex-1 bg-accent text-white text-sm rounded-btn px-3 py-1.5 font-medium hover:bg-accent/90 transition-colors"
            >
              Save & Accept
            </button>
            <button
              onClick={() => setEditing(false)}
              className="text-sm text-sub border border-border rounded-btn px-3 py-1.5 hover:bg-bg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!editing && (
        <div className="flex gap-2 border-t border-border pt-3">
          <button
            onClick={onAccept}
            className="flex-1 bg-accent text-white text-sm rounded-btn px-3 py-1.5 font-medium hover:bg-accent/90 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-sub border border-border rounded-btn px-3 py-1.5 hover:bg-bg transition-colors"
          >
            Edit
          </button>
          <button
            onClick={onDismiss}
            className="text-sm text-sub border border-border rounded-btn px-3 py-1.5 hover:bg-bg transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
