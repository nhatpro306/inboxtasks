import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma, encryptSecret, ensureUser } from "@inboxtasks/db";

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
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  authType: string;
  lastSeenUid: number;
  lastSyncedAt: Date | null;
}) {
  return {
    id: a.id,
    email_address: a.emailAddress,
    imap_host: a.imapHost,
    imap_port: a.imapPort,
    auth_type: a.authType,
    last_seen_uid: a.lastSeenUid,
    last_synced_at: a.lastSyncedAt,
  };
}

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/accounts", async () => {
    const accounts = await prisma.emailAccount.findMany({ orderBy: { createdAt: "asc" } });
    return { accounts: accounts.map(publicAccount) };
  });

  app.post("/api/accounts", async (req, reply) => {
    const parsed = createAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_failed", details: parsed.error.flatten() });
    }
    const b = parsed.data;
    const userId = await ensureUser();
    const secretRef = encryptSecret(JSON.stringify({ user: b.email_address, pass: b.app_password }));
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
  });

  app.delete("/api/accounts/:id", async (req, reply) => {
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_id" });
    try {
      await prisma.emailAccount.delete({ where: { id: params.data.id } });
    } catch {
      return reply.code(404).send({ error: "not_found" });
    }
    return reply.code(204).send();
  });
}
