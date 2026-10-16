import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, encryptSecret, ensureUser, writeAudit } from "@inboxtasks/db";
import {
  getMemoryAccounts,
  createMemoryAccount,
  deleteMemoryAccount,
} from "../lib/memoryStore.js";

const createAccountSchema = z.object({
  email_address: z.string().email(),
  imap_host: z.string().min(1).default("imap.gmail.com"),
  imap_port: z.number().int().positive().default(993),
  auth_type: z.enum(["app_password", "xoauth2"]).default("app_password"),
  app_password: z.string().min(1),
});

// Shape returned to clients — NEVER includes the secret.
function publicAccount(a: {
  id: string;
  emailAddress?: string;
  email_address?: string;
  imapHost?: string;
  imap_host?: string;
  imapPort?: number;
  imap_port?: number;
  authType?: string;
  auth_type?: string;
  lastSeenUid?: number;
  last_seen_uid?: number;
  lastSyncedAt?: Date | string | null;
  last_synced_at?: Date | string | null;
}) {
  const lastSynced = a.lastSyncedAt ?? a.last_synced_at;
  return {
    id: a.id,
    email_address: a.emailAddress ?? a.email_address ?? "",
    imap_host: a.imapHost ?? a.imap_host ?? "imap.gmail.com",
    imap_port: a.imapPort ?? a.imap_port ?? 993,
    auth_type: a.authType ?? a.auth_type ?? "app_password",
    last_seen_uid: a.lastSeenUid ?? a.last_seen_uid ?? 0,
    last_synced_at: lastSynced instanceof Date ? lastSynced.toISOString() : (lastSynced ?? null),
  };
}

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/accounts", async () => {
    let userId = "default-user";
    try {
      userId = await ensureUser();
      const accounts = await prisma.emailAccount.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      return { accounts: accounts.map(publicAccount) };
    } catch (err) {
      console.warn("[accounts] Database unavailable on GET /api/accounts, fallback to memoryStore:", (err as Error).message);
      const memAccounts = getMemoryAccounts(userId);
      return { accounts: memAccounts.map(publicAccount) };
    }
  });

  app.post("/api/accounts", async (req, reply) => {
    const parsed = createAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }
    const b = parsed.data;
    let userId = "default-user";
    let secretRef: string;
    try {
      secretRef = encryptSecret(JSON.stringify({ user: b.email_address, pass: b.app_password }));
    } catch {
      secretRef = JSON.stringify({ user: b.email_address, pass: b.app_password });
    }

    try {
      userId = await ensureUser();
      const account = await prisma.emailAccount.create({
        data: {
          userId,
          emailAddress: b.email_address,
          imapHost: b.imap_host,
          imapPort: b.imap_port,
          authType: b.auth_type,
          secretRef,
        },
      });
      return reply.code(201).send(publicAccount(account));
    } catch (err) {
      console.warn("[accounts] Database unavailable on POST /api/accounts, fallback to memoryStore:", (err as Error).message);
      const memAccount = createMemoryAccount({
        userId,
        emailAddress: b.email_address,
        imapHost: b.imap_host,
        imapPort: b.imap_port,
        authType: b.auth_type,
        secretRef,
      });
      return reply.code(201).send(publicAccount(memAccount));
    }
  });

  app.delete("/api/accounts/:id", async (req, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });
    let userId = "default-user";
    try {
      userId = await ensureUser();
      try {
        await prisma.emailAccount.delete({ where: { id: params.data.id } });
      } catch (delErr: any) {
        if (delErr?.code === "P2025") {
          const deleted = deleteMemoryAccount(params.data.id);
          if (!deleted) {
            return reply.code(404).send({ error: "not_found" });
          }
          return reply.code(204).send();
        }
        throw delErr;
      }
      void writeAudit({
        userId,
        action: "account.delete",
        targetType: "email_account",
        targetId: params.data.id,
      }).catch(() => {});
      return reply.code(204).send();
    } catch (err) {
      console.warn("[accounts] Database unavailable on DELETE /api/accounts/:id, fallback to memoryStore:", (err as Error).message);
      deleteMemoryAccount(params.data.id);
      return reply.code(204).send();
    }
  });
}
