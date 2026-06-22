import { prisma } from "./prisma.js";

interface AuditEntry {
  userId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}

const MAX_META_BYTES = 2048;

/**
 * Write an audit log row. Failures are silently swallowed so auditing
 * never breaks the request that triggered it.
 */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    let metaStr: string | null = null;
    if (entry.meta && Object.keys(entry.meta).length > 0) {
      metaStr = JSON.stringify(entry.meta);
      if (metaStr.length > MAX_META_BYTES) {
        metaStr = metaStr.slice(0, MAX_META_BYTES);
      }
    }
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId ?? null,
        meta: metaStr,
      },
    });
  } catch (err) {
    console.error("[audit] writeAudit failed:", (err as Error).message);
  }
}
