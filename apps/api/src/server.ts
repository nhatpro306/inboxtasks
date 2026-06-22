import { buildApp } from "./app.js";
import { env } from "./env.js";

try {
  const app = await buildApp();
  await app.listen({ port: env.port, host: env.host });
} catch (err) {
  console.error(err);
  process.exit(1);
}
