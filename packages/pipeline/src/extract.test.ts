import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock setup ────────────────────────────────────────────────────────
const { mockTask, mockEmail, mockSettings } = vi.hoisted(() => ({
  mockTask: { create: vi.fn() },
  mockEmail: { findMany: vi.fn(), update: vi.fn() },
  mockSettings: { findUnique: vi.fn() },
}));

// ── Mock @inboxtasks/db ───────────────────────────────────────────────────────
vi.mock("@inboxtasks/db", () => ({
  prisma: {
    task: mockTask,
    email: mockEmail,
    settings: mockSettings,
  },
  decryptSecret: (_blob: string) => "fake-gemini-key",
}));

// ── Hoisted mock for extractWithFailover ─────────────────────────────────────
const { mockExtractWithFailover } = vi.hoisted(() => ({
  mockExtractWithFailover: vi.fn(),
}));

vi.mock("@inboxtasks/llm", () => ({
  extractWithFailover: mockExtractWithFailover,
}));

// Import AFTER mocks
import { processUnprocessedEmails } from "./extract.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDbEmail(id: string) {
  return {
    id,
    userId: "user-1",
    subject: `Subject of ${id}`,
    cleanSnippet: "some snippet",
    processedAt: null,
    receivedAt: new Date(),
  };
}

function makeExtractedTask(i: number) {
  return {
    title: `Task ${i}`,
    description: `Description ${i}`,
    due_date: null,
    priority: "medium" as const,
    confidence: 0.9,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSettings.findUnique.mockResolvedValue(null);
  mockTask.create.mockResolvedValue({ id: "task-id" });
  mockEmail.update.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("processUnprocessedEmails", () => {
  it("extractWithFailover returns 2 tasks → creates 2 rows with status=suggested, createdVia=ai, sets processedAt", async () => {
    const email = makeDbEmail("email-1");
    mockEmail.findMany.mockResolvedValue([email]);
    mockExtractWithFailover.mockResolvedValue({
      provider: "ollama",
      tasks: [makeExtractedTask(1), makeExtractedTask(2)],
    });

    await processUnprocessedEmails();

    expect(mockTask.create).toHaveBeenCalledTimes(2);

    for (const call of mockTask.create.mock.calls) {
      const data = (call[0] as { data: Record<string, unknown> }).data;
      expect(data.status).toBe("suggested");
      expect(data.createdVia).toBe("ai");
      expect(data.userId).toBe("user-1");
    }

    expect(mockEmail.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "email-1" },
        data: expect.objectContaining({ processedAt: expect.any(Date) }),
      }),
    );
  });

  it("extractWithFailover throws → no task.create, email.update NOT called (processedAt stays null for retry)", async () => {
    const email = makeDbEmail("email-2");
    mockEmail.findMany.mockResolvedValue([email]);
    mockExtractWithFailover.mockRejectedValue(new Error("LLM unavailable"));

    // Must not throw — errors are caught per-email so next cycle retries
    await expect(processUnprocessedEmails()).resolves.toBeUndefined();

    expect(mockTask.create).not.toHaveBeenCalled();
    expect(mockEmail.update).not.toHaveBeenCalled();
  });
});
