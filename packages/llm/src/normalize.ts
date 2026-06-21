const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Normalize an LLM-provided due date to an ISO date (YYYY-MM-DD) or null. Deterministic; `now` injectable for tests.
export function normalizeDueDate(input: string | null | undefined, now: Date = new Date()): string | null {
  if (input == null) return null;
  const raw = input.trim().toLowerCase();
  if (raw === "" || raw === "none" || raw === "null" || raw === "n/a") return null;

  if (raw === "today") return toISODate(now);
  if (raw === "tomorrow") return toISODate(addDays(now, 1));
  if (raw === "yesterday") return toISODate(addDays(now, -1));

  const wd = raw.match(/^(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (wd) {
    const target = WEEKDAYS.indexOf(wd[2]!);
    return toISODate(nextWeekday(now, target, Boolean(wd[1])));
  }

  const inDays = raw.match(/^in\s+(\d+)\s+days?$/);
  if (inDays) return toISODate(addDays(now, Number(inDays[1])));

  const parsed = new Date(input);
  if (!Number.isNaN(parsed.getTime())) return toISODate(parsed);

  return null; // unparseable → drop the date, keep the task
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}
function nextWeekday(from: Date, target: number, forceNextWeek: boolean): Date {
  const r = new Date(from);
  let diff = (target - r.getUTCDay() + 7) % 7;
  if (diff === 0) diff = 7; // never today; next occurrence
  if (forceNextWeek) diff += 7;
  r.setUTCDate(r.getUTCDate() + diff);
  return r;
}
