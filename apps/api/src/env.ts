import { config } from "dotenv";
import { resolve } from "node:path";

// Load root .env regardless of cwd.
try {
  config({ path: resolve(process.cwd(), ".env") });
  if (typeof import.meta.dirname === "string") {
    config({ path: resolve(import.meta.dirname, "../../../.env") });
  }
} catch {
  // Ignore missing or inaccessible .env in production serverless environments
}

export const env = {
  port: Number(process.env.API_PORT ?? 3001),
  host: process.env.API_HOST ?? "0.0.0.0",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
};
