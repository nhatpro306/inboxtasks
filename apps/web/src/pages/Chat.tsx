import { useState } from "react";

export function Chat() {
  const [input, setInput] = useState("");

  return (
    <div className="flex flex-col h-full min-h-[60vh]">
      <h1 className="text-lg font-semibold mb-4">Chat</h1>

      {/* Message area */}
      <div className="flex-1 bg-card rounded-card border border-border shadow-card p-5 flex flex-col items-center justify-center text-center mb-4 min-h-[300px]">
        <div className="w-12 h-12 rounded-card bg-accent-tint text-accent grid place-items-center mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-sub font-medium">Chat assistant arrives in the next update.</p>
        <p className="text-muted text-sm mt-1">Sprint 4 will bring AI-powered task chat.</p>
      </div>

      {/* Input bar */}
      <div className="flex gap-2">
        <input
          className="flex-1 text-sm border border-border rounded-btn px-3 py-2 focus:outline-none bg-card cursor-not-allowed opacity-50"
          placeholder="Ask anything about your tasks…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled
        />
        <button
          disabled
          className="bg-accent text-white text-sm rounded-btn px-4 py-2 font-medium opacity-50 cursor-not-allowed"
        >
          Send
        </button>
      </div>
    </div>
  );
}
