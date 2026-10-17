import { useState, useEffect, useCallback } from "react";
import { api, type Task } from "../lib/api.js";
import {
  MailReplyIcon,
  CloseIcon,
  SparklesIcon,
  SpinnerIcon,
  CopyIcon,
  CheckIcon,
  ExternalLinkIcon,
} from "./Icons.js";

export interface EmailReplyModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmailReplyModal({
  task,
  isOpen,
  onClose,
}: EmailReplyModalProps) {
  const [draft, setDraft] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate initial polite template when modal opens
  useEffect(() => {
    if (isOpen && task) {
      setCopied(false);
      const defaultDraft = `Hi there,\n\nThank you for reaching out. I have noted the action item "${task.title}" and am currently taking care of it.\n\nI will keep you updated once it is completed.\n\nBest regards,`;
      setDraft(defaultDraft);
    }
  }, [isOpen, task?.id]);

  // Handle ESC key
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

  const emailSubject = `Re: ${task.title}`;

  const handleGenerateAiReply = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Draft a concise, polite, and professional email reply acknowledging and confirming progress on the following task: "${task.title}". Context/Details: ${task.description || "None provided"}. Keep the greeting, body, and sign-off clear and ready to send.`;
      const res = await api.chat(prompt);
      if (res && res.reply) {
        setDraft(res.reply.trim());
      }
    } catch {
      // Fallback if network or chat fails
      const fallbackDraft = `Hi,\n\nThanks for following up. Regarding "${task.title}", I am reviewing the details and handling this now.\n\nI will circle back shortly with an update.\n\nBest regards,`;
      setDraft(fallbackDraft);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback copy
      const textarea = document.createElement("textarea");
      textarea.value = draft;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(draft)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-reply-heading"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-card shadow-elevated border border-border w-full max-w-lg p-6 flex flex-col relative animate-modal-pop max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-accent-tint text-accent flex items-center justify-center flex-shrink-0">
              <MailReplyIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 id="email-reply-heading" className="text-sm font-semibold text-text">
                Draft Email Reply
              </h2>
              <p className="text-xs text-sub truncate max-w-sm">
                Subject: <span className="font-medium text-text">{emailSubject}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close email reply dialog"
            className="text-muted hover:text-text p-1 rounded-full hover:bg-border/40 transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Task Info Pill */}
        <div className="bg-surface rounded-btn border border-border/70 px-3 py-2 mb-3 text-xs flex items-center justify-between gap-2">
          <span className="text-sub font-medium truncate">
            Task: <span className="text-text font-semibold">{task.title}</span>
          </span>
          {task.source_email_id && (
            <span className="text-[10px] bg-accent/10 text-accent font-medium px-2 py-0.5 rounded-full flex-shrink-0">
              Email Linked
            </span>
          )}
        </div>

        {/* AI Generator Button */}
        <button
          type="button"
          onClick={handleGenerateAiReply}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-purple-600 hover:from-accent-hover hover:to-purple-700 text-white text-xs font-semibold py-2 px-3 rounded-btn shadow-xs disabled:opacity-50 transition-all mb-3"
        >
          {isGenerating ? (
            <>
              <SpinnerIcon className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Generating draft with Gemini 3.8 Flash…</span>
            </>
          ) : (
            <>
              <SparklesIcon className="w-3.5 h-3.5 text-white" />
              <span>Generate AI Reply with Gemini 3.8 Flash</span>
            </>
          )}
        </button>

        {/* Editable Email Draft Textarea */}
        <div className="flex flex-col gap-1.5 mb-4">
          <label htmlFor="email-draft-text" className="text-xs font-medium text-sub">
            Email Body
          </label>
          <textarea
            id="email-draft-text"
            rows={7}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full text-xs font-sans text-text bg-surface/50 border border-border rounded-btn p-3 focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none leading-relaxed"
            placeholder="Type your email reply here..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-btn border transition-colors ${
              copied
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                : "border-border text-sub hover:text-text hover:bg-surface"
            }`}
          >
            {copied ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                <span>Copy Text</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-sub border border-border rounded-btn px-3 py-2 hover:bg-surface transition-colors font-medium"
            >
              Cancel
            </button>
            <a
              href={mailtoUrl}
              className="inline-flex items-center gap-1.5 text-xs bg-accent text-white font-medium px-3.5 py-2 rounded-btn hover:bg-accent-hover active:bg-accent-active transition-colors shadow-xs"
            >
              <span>Open in Mail App</span>
              <ExternalLinkIcon className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
