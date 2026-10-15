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
  const [accepting, setAccepting] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showContext, setShowContext] = useState(false);

  async function handleEdit() {
    setSaving(true);
    try {
      onEdit({ title, due_date: dueDate || null, priority });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleAccept() {
    setAccepting(true);
    try {
      onAccept();
    } finally {
      setAccepting(false);
    }
  }

  async function handleDismiss() {
    setDismissing(true);
    try {
      onDismiss();
    } finally {
      setDismissing(false);
    }
  }

  const matchPct =
    s.match != null
      ? s.match <= 1 && s.match > 0
        ? Math.round(s.match * 100)
        : Math.round(s.match)
      : 0;

  const contextText =
    s.cleanSnippet ||
    s.source_email?.snippet ||
    s.description ||
    (s.source_email?.subject ? `Subject: ${s.source_email.subject}` : null);

  return (
    <article
      aria-label={`Suggestion: ${s.title}`}
      className="bg-card rounded-card shadow-card border border-border p-4 flex flex-col gap-3"
    >
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
        <span
          aria-label={`${matchPct}% match confidence`}
          className="inline-flex items-center rounded-pill bg-accent-tint text-accent text-xs font-medium px-2 py-0.5 flex-shrink-0"
        >
          {matchPct}% match
        </span>
      </div>

      {/* Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <PriorityPill priority={s.priority} />
        {s.due_date && (
          <span className="text-xs text-sub">{fmtDate(s.due_date)}</span>
        )}
      </div>

      {/* Email Context Preview */}
      {contextText && (
        <div className="bg-bg/60 rounded-btn p-2.5 text-xs text-sub border border-border/50">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-text flex items-center gap-1.5">
              <svg aria-hidden="true" focusable="false" className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email Context
            </span>
            <button
              type="button"
              onClick={() => setShowContext((prev) => !prev)}
              aria-expanded={showContext}
              className="text-accent hover:underline text-xs font-medium"
            >
              {showContext ? "Show less" : "Show more"}
            </button>
          </div>
          <p className={`mt-1.5 text-muted leading-relaxed whitespace-pre-wrap ${showContext ? "" : "line-clamp-2"}`}>
            {contextText}
          </p>
        </div>
      )}

      {/* Inline edit form */}
      {editing && (
        <div role="group" aria-label="Edit suggestion" className="border-t border-border pt-3 flex flex-col gap-2">
          <div>
            <label htmlFor={`edit-title-${s.id}`} className="sr-only">Title</label>
            <input
              id={`edit-title-${s.id}`}
              className="text-sm border border-border rounded-btn px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
            />
          </div>
          <div>
            <label htmlFor={`edit-due-${s.id}`} className="sr-only">Due date</label>
            <input
              id={`edit-due-${s.id}`}
              type="date"
              className="text-sm border border-border rounded-btn px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor={`edit-priority-${s.id}`} className="sr-only">Priority</label>
            <select
              id={`edit-priority-${s.id}`}
              className="text-sm border border-border rounded-btn px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={priority}
              onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleEdit()}
              disabled={saving}
              className="flex-1 bg-accent text-white text-sm rounded-btn px-3 py-1.5 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save & Accept"}
            </button>
            <button
              type="button"
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
            type="button"
            onClick={() => void handleAccept()}
            disabled={accepting}
            aria-label={`Accept suggestion: ${s.title}`}
            className="flex-1 bg-accent text-white text-sm rounded-btn px-3 py-1.5 font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {accepting ? "Accepting…" : "Accept"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit suggestion: ${s.title}`}
            className="text-sm text-sub border border-border rounded-btn px-3 py-1.5 hover:bg-bg transition-colors"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void handleDismiss()}
            disabled={dismissing}
            aria-label={`Dismiss suggestion: ${s.title}`}
            className="text-sm text-sub border border-border rounded-btn px-3 py-1.5 hover:bg-bg transition-colors"
          >
            {dismissing ? "Dismissing…" : "Dismiss"}
          </button>
        </div>
      )}
    </article>
  );
}
