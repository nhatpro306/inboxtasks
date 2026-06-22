# InboxTasks — E2E Tests

Playwright tests for the full happy path: add account → scan → review → today → calendar → notifications.

## Guard

All tests are skipped unless `E2E_LIVE=1` is set. Running `npx playwright test` without the flag passes immediately (0 tests run, all skipped). This keeps CI green without a live stack.

## Prerequisites

| Requirement | Notes |
|---|---|
| Full stack running | `docker compose up -d postgres && npm run dev` |
| Ollama with qwen3:8b | `ollama serve && ollama pull qwen3:8b` |
| Playwright browsers | `npx playwright install chromium` (once) |
| A test Gmail app password | Use a throwaway account; enable 2FA + generate an app password |

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `E2E_LIVE` | (unset) | Set to `1` to enable tests. Unset = all skipped. |
| `E2E_BASE_URL` | `http://localhost:5173` | Base URL of the web app. |

## Running

```bash
# Install browser binaries (once per machine)
npx playwright install chromium

# Run with a live stack
E2E_LIVE=1 npx playwright test

# Custom base URL
E2E_LIVE=1 E2E_BASE_URL=http://localhost:5173 npx playwright test

# Show browser (headed mode, useful for debugging)
E2E_LIVE=1 npx playwright test --headed

# Generate an HTML report
E2E_LIVE=1 npx playwright test --reporter=html && npx playwright show-report
```

## Test coverage

1. **Settings** — add an email account via the accessible form
2. **Scan now** — trigger inbox scan from the header button
3. **Review** — accept a suggestion card
4. **Today** — verify accepted task appears in the task list
5. **Calendar** — verify a task event dot is visible in FullCalendar
6. **Notifications** — verify the push notification toggle is accessible (role=switch + aria-checked)
