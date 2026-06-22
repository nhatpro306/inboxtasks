import { describe, it, expect } from "vitest";
import { parseChatResponse } from "./chat.js";

describe("parseChatResponse", () => {
  it("parses valid JSON with create_task action", () => {
    const raw = JSON.stringify({
      reply: "Created.",
      proposed_action: { type: "create_task", title: "Pay rent", due_date: "2025-02-01" },
    });
    const result = parseChatResponse(raw);
    expect(result.reply).toBe("Created.");
    expect(result.proposed_action).not.toBeNull();
    expect(result.proposed_action?.type).toBe("create_task");
    expect(result.proposed_action?.title).toBe("Pay rent");
    expect(result.proposed_action?.due_date).toBe("2025-02-01");
  });

  it("parses JSON wrapped in prose / <think> tags", () => {
    const raw = `<think>let me think about this</think> Here is my response: {"reply":"Got it.","proposed_action":{"type":"create_task","title":"Buy groceries"}} That's my answer.`;
    const result = parseChatResponse(raw);
    expect(result.reply).toBe("Got it.");
    expect(result.proposed_action?.type).toBe("create_task");
    expect(result.proposed_action?.title).toBe("Buy groceries");
  });

  it("returns prose as reply with null action when no JSON present", () => {
    const raw = "You have 3 tasks due this week.";
    const result = parseChatResponse(raw);
    expect(result.reply).toBe("You have 3 tasks due this week.");
    expect(result.proposed_action).toBeNull();
  });

  it("returns null action when action type is not whitelisted (delete_task)", () => {
    const raw = JSON.stringify({
      reply: "ok",
      proposed_action: { type: "delete_task", task_id: "x" },
    });
    const result = parseChatResponse(raw);
    // The enum rejects delete_task → whole parse fails → no unsafe action leaks through
    expect(result.proposed_action).toBeNull();
    // reply falls back to the raw text since overall parse failed
    expect(typeof result.reply).toBe("string");
    expect(result.reply.length).toBeGreaterThan(0);
  });

  it("parses complete_task action with task_id", () => {
    const raw = JSON.stringify({
      reply: "done",
      proposed_action: { type: "complete_task", task_id: "abc" },
    });
    const result = parseChatResponse(raw);
    expect(result.reply).toBe("done");
    expect(result.proposed_action?.type).toBe("complete_task");
    expect(result.proposed_action?.task_id).toBe("abc");
  });
});
