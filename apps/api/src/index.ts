import Fastify from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import { env } from "./env.js";

const app = Fastify({ logger: true });

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  referrerPolicy: { policy: "no-referrer" },
});

await app.register(cors, { origin: env.webOrigin, credentials: true });

app.get("/health", async () => ({
  status: "ok",
  service: "inboxtasks-api",
  time: new Date().toISOString(),
}));

try {
  await app.listen({ port: env.port, host: env.host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
