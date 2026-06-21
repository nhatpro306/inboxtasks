import { PrismaClient } from "@prisma/client";

// Single shared client. Reused across worker + api in this single-user app.
export const prisma = new PrismaClient();

export type { PrismaClient } from "@prisma/client";
