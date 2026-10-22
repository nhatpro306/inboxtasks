# InboxTasks

Single-user, installable PWA that scans your email over IMAP, uses Ollama or Gemini to turn action-bearing emails into **suggested** to-do items, lets you review/edit them in a list and a calendar (two-way Google Calendar sync), and includes a chatbot that reads and edits your tasks. The app is designed for one user. Email extraction and proposed chat actions require review; email content is treated as untrusted input. This single-user design does not provide a multi-user login boundary.

## Architecture (npm-workspaces monorepo)

- **apps/web** — React + Vite + TypeScript + Tailwind PWA (installable, offline). Today / All / Review / Calendar (FullCalendar) / Chat / Settings.
- **apps/api** — Fastify REST API (helmet, zod, CORS).
- **apps/worker** — node-cron scheduler; runs the ingest/extract/reminder cycle on startup and on its configured cron schedule.
- **packages/pipeline** — IMAP fetch + MIME parse + sanitize + AI extraction + web-push reminders (shared by worker and `/api/scan-now`).
- **packages/llm** — `LLMProvider` abstraction: Ollama (qwen3:8b) + Gemini (gemini-2.5-flash, REST) with auto failover; extraction prompt, validation, chat action protocol.
- **packages/db** — Prisma client, AES-256-GCM credential encryption, single-user bootstrap, audit-log helper.
- **packages/shared** — shared types, zod schemas, email sanitizer, pure helpers.
- **db/schema.prisma** — PostgreSQL schema. **docker-compose.yml** — local Postgres.

## Prerequisites

- Node.js 20+ and npm (the repo tracks `package-lock.json`), Docker Desktop
- For local AI: [Ollama](https://ollama.com) with the configured model (`ollama pull qwen3:8b` for the default). Gemini requires a server-side API key instead.

## Setup

```bash
git clone https://github.com/nhatpro306/inboxtasks.git
cd inboxtasks
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
npm ci
npm run db:generate
npm run db:migrate        # creates tables (Postgres must be up)
npm run dev               # web :5173 · api :3001 · worker
```

Open [localhost:5173](http://localhost:5173) (PWA). API health: [localhost:3001/health](http://localhost:3001/health). On PowerShell, use `Copy-Item .env.example .env` in place of `cp` if preferred.

Set a unique `APP_MASTER_KEY` before storing real inbox credentials; the current implementation falls back to a built-in key when this variable is missing, and startup logs a warning rather than enforcing a fail-fast boundary. Do not treat a successful startup as proof of secure configuration.

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
- Request schemas, Prisma queries and log redaction are implemented in the API. Configure and preserve `APP_MASTER_KEY` for encrypted stored credentials; the current startup warning/fallback behavior is described above.
- helmet headers (CSP, HSTS, X-Content-Type-Options, frame-ancestors, Referrer-Policy, Permissions-Policy). IMAP over TLS:993.
- Destructive actions: soft-delete + explicit confirmation + audit log.

## Recorded implementation milestones

These milestones describe the existing implementation. They are not a fresh test report; use the commands above to verify your checkout and service configuration.

- **0 Foundations** ✅ monorepo, Postgres + Prisma, Fastify `/health`, installable PWA shell
- **1 Email ingestion** ✅ IMAP TLS:993, encrypted creds, sanitize, dedup by message_id, last_seen_uid high-water mark, scheduled polling
- **2 AI extraction** ✅ Ollama + Gemini failover, structural-separation prompt, validation, suggested tasks
- **3 Task UX + calendar** ✅ CRUD, Today/All/Review, FullCalendar, two-way Google Calendar sync, web-push reminders
- **4 Chatbot** ✅ retrieval + confirm-gated action protocol
- **5 Hardening** ✅ security pass, injection + integration test suites, accessibility, polish, E2E scaffold

## Deploy to Vercel (full serverless, Gemini-only)

Ollama and the local worker process do not run in a serverless environment. On Vercel, the AI pipeline uses **Gemini** exclusively and scheduled scanning is handled by a **Vercel Cron** job (`/api/cron`). The Fastify app is served as a single catch-all serverless function (`/api/*`). The committed `vercel.json` schedules `/api/cron` **daily at 00:00 UTC (09:00 JST)**, and `api/cron.ts` requires `CRON_SECRET`. The local worker has a separate schedule; changing its interval does not change Vercel Cron.

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
   | `CRON_SECRET` | Server-side bearer secret checked by `api/cron.ts` |

   `VITE_API_URL` can be left unset — the web build defaults to same-origin (`""`) in production so `/api/...` calls resolve on the Vercel domain automatically.

4. **Run the database migration once** against the hosted database (from your local machine):

   ```bash
   DATABASE_URL="<your-hosted-pooled-url>" npx prisma migrate deploy --schema db/schema.prisma
   ```

   Or use a one-off Vercel function / CI step. This only needs to run when the schema changes.

5. **Deploy** — Vercel runs the build command (`npm run db:generate && npm run build:packages && npm run build:api && npm run build --workspace apps/web`), serves the SPA from `apps/web/dist`, and routes `/api/*` to the serverless function.

### How it works in production

- **`/api/cron`** — Vercel Cron calls this endpoint daily (committed schedule: `0 0 * * *`). The handler rejects requests without the configured bearer secret. It runs `runCycle()`: IMAP ingest → AI extraction → reminder push.
- **`/api/*`** — All other API calls (including `/health`) are handled by the Fastify catch-all function. The Fastify instance is cached across warm invocations.
- **60-second function limit** — large email backlogs process across multiple cron runs (50 emails per cycle by default). This is by design.
- **Ollama is not used** — set `AI_PROVIDER_PREF=gemini`; the `local` provider and Ollama URL are ignored.

## Known follow-ups

- PWA icons (`apps/web/public/pwa-*.png`) are 1×1 placeholders — replace with real artwork.
- Re-run a dependency audit for the current lockfile; older audit notes are not evidence that the current dependency tree is clean.
- The API bootstraps a single user and does not implement an interactive login/session boundary. Restrict access to a trusted user/environment before connecting real inboxes; CORS alone is not authentication.
- HTTPS termination is a deployment concern (run behind a TLS-terminating proxy).
- Confirm `POLL_INTERVAL_MINUTES` against `apps/worker/src/index.ts`: the current cron minute step is clamped to 1–59, so the default value 60 does not produce an exact hourly interval.
