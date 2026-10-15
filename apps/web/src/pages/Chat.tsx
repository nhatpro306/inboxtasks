import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import type { ChatMessage, ProposedAction } from "../lib/api.js";
import { appEvents } from "../lib/events.js";

function actionSummary(action: ProposedAction): string {
  switch (action.type) {
    case "create_task": {
      const parts = ['Create task "' + (action.title ?? "(untitled") + '"'];
      if (action.due_date) parts.push("due " + action.due_date);
      if (action.priority && action.priority !== "medium") parts.push("priority: " + action.priority);
      return parts.join(" - ");
    }
    case "update_task": {
      const parts: string[] = [];
      if (action.title) parts.push(`rename to "${action.title}"`);
      if (action.due_date) parts.push(`due ${action.due_date}`);
      if (action.priority) parts.push(`priority: ${action.priority}`);
      if (action.status) parts.push(`status: ${action.status}`);
      return `Update task${parts.length ? `: ${parts.join(", ")}` : ""}`;
    }
    case "complete_task":
      return "Mark task complete";
    default:
      return "Proposed action";
  }
}

interface PendingAction {
  action: ProposedAction;
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputId = "chat-input";

  // Load history on mount
  useEffect(() => {
    api
      .chatHistory()
      .then((data) => {
        setMessages(data.messages);
      })
      .catch(() => {
        // ignore — start fresh
      })
      .finally(() => {
        setHistoryLoaded(true);
      });
  }, []);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingAction]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setPendingAction(null);

    // Optimistic append
    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);
    try {
      const res = await api.chat(text);
      const assistantMsg: ChatMessage = { role: "assistant", content: res.reply };
      setMessages((prev) => [...prev, assistantMsg]);
      if (res.proposed_action) {
        setPendingAction({ action: res.proposed_action });
      }
    } catch {
      const errMsg: ChatMessage = {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  }

  async function handleConfirm() {
    if (!pendingAction || confirmLoading) return;
    setConfirmLoading(true);
    try {
      const res = await api.chatConfirm(pendingAction.action);
      const confirmMsg: ChatMessage = {
        role: "assistant",
        content: `Done — "${res.task.title}" ${pendingAction.action.type === "complete_task" ? "marked complete" : pendingAction.action.type === "create_task" ? "created" : "updated"}.`,
      };
      setMessages((prev) => [...prev, confirmMsg]);
      setPendingAction(null);
      appEvents.emit("tasks:changed");
    } catch {
      const errMsg: ChatMessage = {
        role: "assistant",
        content: "Action failed. Please try again.",
      };
      setMessages((prev) => [...prev, errMsg]);
      setPendingAction(null);
    } finally {
      setConfirmLoading(false);
    }
  }

  function handleCancel() {
    setPendingAction(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  const isEmpty = historyLoaded && messages.length === 0 && !loading;

  return (
    <div className="flex flex-col h-full min-h-[60vh]">
      <h1 className="text-lg font-semibold mb-4">Chat</h1>

      {/* Message area */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        className="flex-1 bg-card rounded-card border border-border shadow-card p-4 flex flex-col mb-4 min-h-[360px] overflow-y-auto"
      >
        {isEmpty ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-card bg-accent-tint text-accent grid place-items-center mb-3" aria-hidden="true">
              <svg
                aria-hidden="true"
                focusable="false"
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sub font-medium mb-1">Ask me anything about your tasks</p>
            <p className="text-muted text-sm mb-4">
              I can help you find, create, update, or complete tasks.
            </p>
            <div className="flex flex-col gap-2 text-sm">
              {[
                "What's due this week?",
                "Create a task to call the dentist on Friday",
                "Move the invoice task to next Monday",
                "Mark the grocery run as complete",
              ].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setInput(example);
                    textareaRef.current?.focus();
                  }}
                  className="text-accent text-left hover:underline bg-accent-tint rounded-pill px-3 py-1.5 transition-colors hover:bg-accent/10"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  role={msg.role === "assistant" ? "article" : undefined}
                  aria-label={msg.role === "assistant" ? "Assistant message" : "Your message"}
                  className={`max-w-[78%] rounded-card px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent text-white"
                      : "bg-card border border-border text-text shadow-sm"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start" role="status" aria-label="Assistant is typing">
                <div className="bg-card border border-border rounded-card px-4 py-3 flex gap-1 items-center shadow-sm">
                  <span aria-hidden="true" className="w-2 h-2 rounded-full bg-muted animate-bounce [animation-delay:-0.3s]" />
                  <span aria-hidden="true" className="w-2 h-2 rounded-full bg-muted animate-bounce [animation-delay:-0.15s]" />
                  <span aria-hidden="true" className="w-2 h-2 rounded-full bg-muted animate-bounce" />
                </div>
              </div>
            )}

            {/* Pending proposed action card */}
            {pendingAction && (
              <div className="flex justify-start w-full mt-1">
                <div
                  role="group"
                  aria-label="Proposed action"
                  className="w-full max-w-[90%] bg-accent-tint border border-accent/30 rounded-card px-4 py-3 text-sm"
                >
                  <p className="text-accent font-semibold mb-1 text-xs uppercase tracking-wide" aria-hidden="true">
                    Proposed action
                  </p>
                  <p className="text-text mb-3">{actionSummary(pendingAction.action)}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void handleConfirm()}
                      disabled={confirmLoading}
                      aria-label="Confirm proposed action"
                      className="bg-accent text-white text-xs font-medium rounded-btn px-4 py-1.5 hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {confirmLoading ? "Confirming…" : "Confirm"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={confirmLoading}
                      aria-label="Cancel proposed action"
                      className="bg-transparent text-sub text-xs font-medium rounded-btn px-4 py-1.5 border border-border hover:bg-bg transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex gap-2 items-end">
        <label htmlFor={inputId} className="sr-only">
          Message — press Enter to send, Shift+Enter for a new line
        </label>
        <textarea
          id={inputId}
          ref={textareaRef}
          rows={1}
          className="flex-1 text-sm border border-border rounded-btn px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/30 bg-card resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Ask anything about your tasks… (Enter to send, Shift+Enter for newline)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{ minHeight: "38px", maxHeight: "120px" }}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className="bg-accent text-white text-sm rounded-btn px-4 py-2 font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );
}
