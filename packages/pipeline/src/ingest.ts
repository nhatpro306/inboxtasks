import { prisma, decryptSecret } from "@inboxtasks/db";
import { sanitizeEmailBody } from "@inboxtasks/shared";
import { fetchNewEmails } from "./imap.js";

interface PrismaKnownError {
  code?: string;
}

// Ingest one account: fetch new mail, parse, sanitize, dedup, persist, advance high-water mark.
export async function ingestAccount(accountId: string): Promise<{ inserted: number; skipped: number }> {
  const account = await prisma.emailAccount.findUnique({ where: { id: accountId } });
  if (!account) return { inserted: 0, skipped: 0 };

  const creds = JSON.parse(decryptSecret(account.secretRef)) as { user: string; pass: string };
  const emails = await fetchNewEmails({
    host: account.imapHost,
    port: account.imapPort,
    user: creds.user,
    pass: creds.pass,
    lastSeenUid: account.lastSeenUid,
  });

  let inserted = 0;
  let skipped = 0;
  let maxUid = account.lastSeenUid;

  for (const e of emails) {
    if (e.uid > maxUid) maxUid = e.uid;
    if (!e.messageId) {
      skipped++;
      continue;
    }
    const cleanSnippet = sanitizeEmailBody({ text: e.text, html: e.html });
    try {
      await prisma.email.create({
        data: {
          userId: account.userId,
          accountId: account.id,
          messageId: e.messageId,
          fromAddress: e.from,
          subject: e.subject,
          receivedAt: e.date,
          cleanSnippet,
        },
      });
      inserted++;
    } catch (err) {
      if ((err as PrismaKnownError).code === "P2002") {
        skipped++; // unique(accountId, messageId) → duplicate, already ingested
      } else {
        throw err;
      }
    }
  }

  await prisma.emailAccount.update({
    where: { id: account.id },
    data: { lastSeenUid: maxUid, lastSyncedAt: new Date() },
  });

  return { inserted, skipped };
}

export async function ingestAllAccounts(): Promise<void> {
  const accounts = await prisma.emailAccount.findMany();
  if (accounts.length === 0) {
    console.log(`[ingest] no accounts configured @ ${new Date().toISOString()}`);
    return;
  }
  for (const a of accounts) {
    try {
      const r = await ingestAccount(a.id);
      console.log(`[ingest] account=${a.id} inserted=${r.inserted} skipped=${r.skipped} @ ${new Date().toISOString()}`);
    } catch (err) {
      // Never log secrets or bodies — only the failure message.
      console.error(`[ingest] account=${a.id} FAILED @ ${new Date().toISOString()}: ${(err as Error).message}`);
    }
  }
}
