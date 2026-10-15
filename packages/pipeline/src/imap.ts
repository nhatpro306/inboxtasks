import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export interface FetchedEmail {
  uid: number;
  messageId: string | null;
  from: string;
  subject: string;
  date: Date;
  text?: string | null;
  html?: string | null;
}

// Connects over TLS:993, fetches messages with UID > lastSeenUid from INBOX.
export async function fetchNewEmails(opts: {
  host: string;
  port: number;
  user: string;
  pass: string;
  lastSeenUid: number;
}): Promise<FetchedEmail[]> {
  const client = new ImapFlow({
    host: opts.host,
    port: opts.port,
    secure: true,
    auth: { user: opts.user, pass: opts.pass },
    logger: false,
  });

  const out: FetchedEmail[] = [];
  let maxUid = opts.lastSeenUid;
  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const range = `${opts.lastSeenUid + 1}:*`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const msg of (client as any).fetch({ uid: range }, { uid: true, source: true, envelope: true }, { uid: true }) as AsyncIterable<any>) {
        // IMAP returns the last message even when none are newer; guard against it.
        if (msg.uid <= opts.lastSeenUid) continue;
        let parsed;
        try {
          parsed = await simpleParser(msg.source as Buffer);
        } catch (parseErr) {
          console.error(`[imap] Failed to parse email uid=${msg.uid}: ${(parseErr as Error).message}`);
          if (msg.uid > maxUid) maxUid = msg.uid;
          continue;
        }
        out.push({
          uid: msg.uid,
          messageId: parsed.messageId ?? msg.envelope?.messageId ?? null,
          from: parsed.from?.text ?? msg.envelope?.from?.[0]?.address ?? "unknown",
          subject: parsed.subject ?? msg.envelope?.subject ?? "(no subject)",
          date: parsed.date ?? msg.envelope?.date ?? new Date(),
          text: parsed.text ?? null,
          html: typeof parsed.html === "string" ? parsed.html : null,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }
  return out;
}
