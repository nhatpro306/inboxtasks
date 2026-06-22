import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock setup (vitest hoists vi.mock calls, so factory vars must use vi.hoisted) ──
const { mockEmailAccount, mockEmail } = vi.hoisted(() => {
  return {
    mockEmailAccount: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    mockEmail: {
      create: vi.fn(),
    },
  };
});

// ── Mock @inboxtasks/db ───────────────────────────────────────────────────────
vi.mock("@inboxtasks/db", () => ({
  prisma: {
    emailAccount: mockEmailAccount,
    email: mockEmail,
  },
  decryptSecret: (_blob: string) => JSON.stringify({ user: "test@example.com", pass: "secret" }),
}));

// ── Hoisted mock for imap ─────────────────────────────────────────────────────
const { mockFetchNewEmails } = vi.hoisted(() => ({ mockFetchNewEmails: vi.fn() }));

vi.mock("./imap.js", () => ({
  fetchNewEmails: mockFetchNewEmails,
}));

// ── Also mock @inboxtasks/shared (sanitizeEmailBody) ─────────────────────────
vi.mock("@inboxtasks/shared", () => ({
  sanitizeEmailBody: (_body: unknown) => "clean snippet",
}));

// Import AFTER mocks are registered
import { ingestAccount } from "./ingest.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<{
  id: string;
  userId: string;
  imapHost: string;
  imapPort: number;
  secretRef: string;
  lastSeenUid: number;
}> = {}) {
  return {
    id: "acct-1",
    userId: "user-1",
    imapHost: "imap.example.com",
    imapPort: 993,
    secretRef: "v1.abc.def.ghi",
    lastSeenUid: 0,
    ...overrides,
  };
}

function makeEmail(uid: number, messageId: string | null = `msg-${uid}@example.com`) {
  return {
    uid,
    messageId,
    from: "sender@example.com",
    subject: `Subject ${uid}`,
    date: new Date(),
    text: `Body of email ${uid}`,
    html: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEmailAccount.update.mockResolvedValue({});
  mockEmail.create.mockResolvedValue({ id: "email-id" });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ingestAccount", () => {
  it("ingests new emails → creates one row per unique message and advances last_seen_uid", async () => {
    mockEmailAccount.findUnique.mockResolvedValue(makeAccount({ lastSeenUid: 4 }));
    mockFetchNewEmails.mockResolvedValue([
      makeEmail(5),
      makeEmail(6),
      makeEmail(7),
    ]);

    const result = await ingestAccount("acct-1");

    expect(result.inserted).toBe(3);
    expect(result.skipped).toBe(0);
    expect(mockEmail.create).toHaveBeenCalledTimes(3);
    expect(mockEmailAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastSeenUid: 7 }),
      }),
    );
  });

  it("dedups by message_id: skips on P2002 unique constraint violation", async () => {
    mockEmailAccount.findUnique.mockResolvedValue(makeAccount({ lastSeenUid: 4 }));
    mockFetchNewEmails.mockResolvedValue([
      makeEmail(5, "msg-1@example.com"),
      makeEmail(6, "msg-1@example.com"), // duplicate messageId
      makeEmail(7, "msg-2@example.com"),
    ]);

    mockEmail.create
      .mockResolvedValueOnce({ id: "e1" })
      .mockRejectedValueOnce(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }))
      .mockResolvedValueOnce({ id: "e3" });

    const result = await ingestAccount("acct-1");

    expect(result.inserted).toBe(2);
    expect(result.skipped).toBe(1);
    // Must not throw
  });

  it("catch-up after a gap: ingests all emails in backlog range and advances uid to max", async () => {
    mockEmailAccount.findUnique.mockResolvedValue(makeAccount({ lastSeenUid: 100 }));
    const backlog = Array.from({ length: 10 }, (_, i) => makeEmail(101 + i));
    mockFetchNewEmails.mockResolvedValue(backlog);

    const result = await ingestAccount("acct-1");

    expect(result.inserted).toBe(10);
    expect(result.skipped).toBe(0);
    expect(mockEmail.create).toHaveBeenCalledTimes(10);
    expect(mockEmailAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastSeenUid: 110 }),
      }),
    );
  });

  it("skips messages with no message_id", async () => {
    mockEmailAccount.findUnique.mockResolvedValue(makeAccount({ lastSeenUid: 0 }));
    mockFetchNewEmails.mockResolvedValue([
      makeEmail(1, null),     // no messageId → skipped
      makeEmail(2, "msg-2"),  // has messageId → inserted
    ]);

    const result = await ingestAccount("acct-1");

    expect(result.skipped).toBe(1);
    expect(result.inserted).toBe(1);
    expect(mockEmail.create).toHaveBeenCalledTimes(1);
  });
});
