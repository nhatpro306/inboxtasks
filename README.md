# InboxTasks

Single-user, installable PWA that scans your email over IMAP, uses a local AI model to turn action-bearing emails into **suggested** to-do items, lets you review/edit them in a list and a calendar (two-way Google Calendar sync), and includes a chatbot that reads and edits your tasks. Privacy posture: single user; credentials and API keys never reach the browser and are encrypted at rest. Email content is treated as untrusted input throughout.

## Architecture (npm-workspaces monorepo)

- **apps/web** — React + Vite + TypeScript + Tailwind PWA (installable, offline). Today / All / Review / Calendar (FullCalendar) / Chat / Settings.
- **apps/api** — Fastify REST API (helmet, zod, CORS).
- **apps/worker** — node-cron scheduler; runs the ingest+extract+reminder cycle hourly.
- **packages/pipeline** — IMAP fetch + MIME parse + sanitize + AI extraction + web-push reminders (shared by worker and `/api/scan-now`).
- **packages/llm** — `LLMProvider` abstraction: Ollama (qwen3:8b) + Gemini (gemini-2.5-flash, REST) with auto failover; extraction prompt, validation, chat action protocol.
- **packages/db** — Prisma client, AES-256-GCM credential encryption, single-user bootstrap, audit-log helper.
- **packages/shared** — shared types, zod schemas, email sanitizer, pure helpers.
- **db/schema.prisma** — PostgreSQL schema. **docker-compose.yml** — local Postgres.

## Prerequisites

- Node >= 20, Docker Desktop
- [Ollama](https://ollama.com): `ollama pull qwen3:8b`

## Setup

```bash
cp .env.example .env
# 1) APP_MASTER_KEY (32 bytes hex):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 2) VAPID keys for web-push:
npx web-push generate-vapid-keys
#    paste public/private into VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY
# 3) (optional) Google Calendar: create an OAuth 2.0 Client (Web) in Google Cloud,
#    set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET, and add the authorized redirect URI
#    http://localhost:3001/api/calendar/callback

docker compose up -d postgres
npm install
npm run db:migrate        # creates tables (Postgres must be up)
npm run dev               # web :5173 · api :3001 · worker
```

Open http://localhost:5173 (installable PWA). API health: http://localhost:3001/health.

**Gmail:** enable 2-factor auth and use an **app password** (not your account password) when adding the inbox in Settings.

## Run targets

| Command | What |
|---|---|
| `npm run dev` | web + api + worker (builds packages first) |
| `npm run build` | build the whole monorepo |
| `npm run typecheck` | typecheck all workspaces |
| `npm run test:all` | unit + integration suites (shared, db, llm, pipeline) |
| `npm run test:e2e` | Playwright E2E (skips unless `E2E_LIVE=1`) |
| `npm run db:migrate` / `db:generate` / `db:studio` | Prisma |
| `npm run docker:up` / `docker:down` | local Postgres |

## Testing

- Unit + integration: `npm run test:all` — sanitizer, schema validator, `pickProvider` failover, due-date normalizer, crypto round-trip/tamper, IMAP→task ingest, dedup, catch-up after a gap, AI extraction, and the **prompt-injection suite** (ignore-instructions / hidden white text / fake `SYSTEM:` blocks → output stays schema-valid, tasks remain suggested-only, no autonomous action; chat drops non-whitelisted actions).
- E2E (Playwright): the full happy path (add account → scan → review → accept → calendar → reminder) lives in `e2e/inbox-flow.spec.ts`, guarded by `E2E_LIVE`. To run it live with the stack up: `npx playwright install chromium` then `E2E_LIVE=1 npm run test:e2e` (override target with `E2E_BASE_URL`).

## Security (summary)

- IMAP credentials & Google OAuth tokens **encrypted at rest** (AES-256-GCM, key from `APP_MASTER_KEY`); never returned by any endpoint, never sent to the browser.
- Gemini API key stored server-side, **write-only**, returned **masked**.
- All AI I/O is **sanitized + delimited (`<untrusted_email>`) + schema-validated** (zod). The model never takes actions: AI-created tasks are **`suggested`** until you accept them; the chatbot only **proposes** actions and the server executes **only after explicit UI confirmation**, with a **whitelist** (`create_task` / `update_task` / `complete_task`) and a server-side ownership re-check.
- zod validation on every endpoint; Prisma parameterized queries; secrets redacted from logs; generic 500s (no stack leak); fail-fast if `APP_MASTER_KEY` is missing/invalid.
- helmet headers (CSP, HSTS, X-Content-Type-Options, frame-ancestors, Referrer-Policy, Permissions-Policy). IMAP over TLS:993.
- Destructive actions: soft-delete + explicit confirmation + audit log.

## Sprint status

- **0 Foundations** ✅ monorepo, Postgres + Prisma, Fastify `/health`, installable PWA shell
- **1 Email ingestion** ✅ IMAP TLS:993, encrypted creds, sanitize, dedup by message_id, last_seen_uid high-water mark, hourly cron
- **2 AI extraction** ✅ Ollama + Gemini failover, structural-separation prompt, validation, suggested tasks
- **3 Task UX + calendar** ✅ CRUD, Today/All/Review, FullCalendar, two-way Google Calendar sync, web-push reminders
- **4 Chatbot** ✅ retrieval + confirm-gated action protocol
- **5 Hardening** ✅ security pass, injection + integration test suites, accessibility, polish, E2E scaffold

## Deploy to Vercel (full serverless, Gemini-only)

Ollama and the local worker process do not run in a serverless environment. On Vercel, the AI pipeline uses **Gemini** exclusively and the hourly scan is handled by a **Vercel Cron** job (`/api/cron`, runs every hour). The Fastify app is served as a single catch-all serverless function (`/api/*`).

### Steps

1. **Push the repo to GitHub** (or GitLab/Bitbucket).
2. **Import the project in [Vercel](https://vercel.com/new)** — select the repo root, framework = Other (vercel.json overrides everything).
3. **Set environment variables** in the Vercel dashboard (Settings → Environment Variables):

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Pooled Postgres URL (Neon pgbouncer or Supabase pooler — required for serverless connection limits) |
   | `APP_MASTER_KEY` | 64-char hex string (same key you generated locally) |
   | `AI_PROVIDER_PREF` | `gemini` |
   | `GEMINI_API_KEY` | Your Gemini API key |
   | `VAPID_PUBLIC_KEY` | From `npx web-push generate-vapid-keys` |
   | `VAPID_PRIVATE_KEY` | From the same command |
   | `VAPID_SUBJECT` | `mailto:<your-email>` |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID (for Calendar) |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
   | `GOOGLE_REDIRECT_URI` | `https://<your-vercel-domain>/api/calendar/callback` |
   | `WEB_ORIGIN` | `https://<your-vercel-domain>` |
   | `USER_EMAIL` | Your email address (single-user bootstrap) |

   `VITE_API_URL` can be left unset — the web build defaults to same-origin (`""`) in production so `/api/...` calls resolve on the Vercel domain automatically.

4. **Run the database migration once** against the hosted database (from your local machine):

   ```bash
   DATABASE_URL="<your-hosted-pooled-url>" npx prisma migrate deploy --schema db/schema.prisma
   ```

   Or use a one-off Vercel function / CI step. This only needs to run when the schema changes.

5. **Deploy** — Vercel runs the build command (`npm run db:generate && npm run build:packages && npm run build --workspace apps/web`), serves the SPA from `apps/web/dist`, and routes `/api/*` to the serverless function.

### How it works in production

- **`/api/cron`** — Vercel Cron calls this endpoint every hour (schedule: `0 * * * *`). It runs `runCycle()`: IMAP ingest → AI extraction → reminder push.
- **`/api/*`** — All other API calls (including `/health`) are handled by the Fastify catch-all function. The Fastify instance is cached across warm invocations.
- **60-second function limit** — large email backlogs process across multiple cron runs (50 emails per cycle by default). This is by design.
- **Ollama is not used** — set `AI_PROVIDER_PREF=gemini`; the `local` provider and Ollama URL are ignored.

## Known follow-ups

- PWA icons (`apps/web/public/pwa-*.png`) are 1×1 placeholders — replace with real artwork.
- Remaining `npm audit` advisories are transitive / dev-only (details in the Sprint 5a commit); schedule the `imapflow`/`mailparser` minor bumps when convenient.
- HTTPS termination is a deployment concern (run behind a TLS-terminating proxy).
