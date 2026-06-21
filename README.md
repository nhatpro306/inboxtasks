# InboxTasks

Single-user installable PWA that scans your email over IMAP, uses a local AI model to suggest to-do items, and syncs them to a calendar. Secrets stay server-side.

## Stack
- **web** — React + Vite + TS, Tailwind, installable PWA (vite-plugin-pwa)
- **api** — Fastify (TS), helmet, CORS, zod
- **worker** — node-cron IMAP poll + AI extraction (Sprint 1+)
- **packages/shared** — types + zod schemas
- **packages/llm** — Ollama + Gemini provider abstraction (Sprint 2+)
- **db** — PostgreSQL via Prisma

## Prerequisites
- Node >= 20, Docker Desktop, (later) [Ollama](https://ollama.com) with `ollama pull qwen3:8b`

## Setup
```bash
cp .env.example .env          # then fill APP_MASTER_KEY etc.
npm install
docker compose up -d postgres
npm run db:migrate            # creates tables
npm run dev                   # web + api + worker
```
- Web: http://localhost:5173  ·  API: http://localhost:3001/health

## Generate APP_MASTER_KEY
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Sprints
- **0 Foundations** ✅ monorepo, Postgres, Prisma schema, /health, PWA shell
- 1 Email ingestion (IMAP, no AI)
- 2 AI extraction (Ollama + Gemini failover)
- 3 Task UX + calendar sync + reminders
- 4 Chatbot
- 5 Hardening
