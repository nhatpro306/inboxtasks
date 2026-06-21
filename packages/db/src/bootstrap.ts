import { prisma } from "./prisma.js";

// Ensure the single user + their settings row exist. Returns the user id.
export async function ensureUser(): Promise<string> {
  const email = process.env.USER_EMAIL ?? "supermanzero30@gmail.com";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, settings: { create: {} } },
  });
  return user.id;
}
