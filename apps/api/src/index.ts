import Fastify from "fastify";
import type { FastifyError } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { ensureUser, encryptSecret } from "@inboxtasks/db";
import { accountRoutes } from "./routes/accounts.js";
import { taskRoutes } from "./routes/tasks.js";
import { settingsRoutes } from "./routes/settings.js";
import { pushRoutes } from "./routes/push.js";
import { calendarRoutes } from "./routes/calendar.js";
import { chatRoutes } from "./routes/chat.js";

// ── FAIL FAST: verify APP_MASTER_KEY is set and decodes to 32 bytes ──────────
try {
  encryptSecret("startup-check");
} catch (err) {
  console.error(
    `[FATAL] APP_MASTER_KEY is missing or invalid: ${(err as Error).message}\n` +
    "Set APP_MASTER_KEY to a 64-char hex string (32 bytes) before starting.",
  );
  process.exit(1);
}

// ── Fastify with log redaction so secrets never hit logs ─────────────────────
const app = Fastify({
  logger: {
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["x-api-key"]',
    ],
  },
});

// ── Generic error handler: never leak stack traces / messages for 500s ────────
app.setErrorHandler((error: FastifyError, request, reply) => {
  const requestId = request.id;
  if (error.statusCode && error.statusCode < 500) {
    // Pass through 4xx validation errors already sent by routes
    return reply.code(error.statusCode).send({ error: error.message, request_id: requestId });
  }
  app.log.error({ err: error, requestId, ts: new Date().toISOString() }, "internal_error");
  return reply.code(500).send({ error: "internal_error", request_id: requestId });
});

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: "no-referrer" },
  // Helmet already sets X-Content-Type-Options nosniff and X-Frame-Options
});

// ── Permissions-Policy: restrict sensitive browser features ──────────────────
app.addHook("onSend", async (_request, reply) => {
  reply.header("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()");
});

await app.register(cors, { origin: env.webOrigin, credentials: true });

app.get("/health", async () => ({
  status: "ok",
  service: "inboxtasks-api",
  time: new Date().toISOString(),
}));

await app.register(accountRoutes);
await app.register(taskRoutes);
await app.register(settingsRoutes);
await app.register(pushRoutes);
await app.register(calendarRoutes);
await app.register(chatRoutes);

// Make sure the single user + settings exist before serving.
await ensureUser();

try {
  await app.listen({ port: env.port, host: env.host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
