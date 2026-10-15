import { config } from "dotenv";
import { resolve } from "node:path";

// Load root .env regardless of cwd.
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(import.meta.dirname, "../../../.env") });

export const env = {
  port: Number(process.env.API_PORT ?? 3001),
  host: process.env.API_HOST ?? "0.0.0.0",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
};
