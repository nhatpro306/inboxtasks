export interface ParsedTaskInput {
  cleanTitle: string;
  dueDate: string | null; // YYYY-MM-DD
  dueTime: string | null; // HH:mm
  priority: "low" | "medium" | "high";
  tags: string[];
}

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseTime(hourStr: string, minStr: string | undefined, ampmStr: string | undefined): string | null {
  let hour = parseInt(hourStr, 10);
  const minute = minStr ? parseInt(minStr, 10) : 0;
  if (isNaN(hour) || isNaN(minute)) return null;
  if (minute < 0 || minute > 59) return null;

  if (ampmStr) {
    const ampm = ampmStr.toLowerCase();
    if (ampm === "pm" && hour < 12) {
      hour += 12;
    } else if (ampm === "am" && hour === 12) {
      hour = 0;
    }
  }

  if (hour < 0 || hour > 23) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function parseNaturalLanguageTask(
  input: string,
  referenceDate = new Date()
): ParsedTaskInput {
  if (!input || !input.trim()) {
    return {
      cleanTitle: "",
      dueDate: null,
      dueTime: null,
      priority: "medium",
      tags: [],
    };
  }

  let text = input;

  // 1. Tags: Detect #([\w-]+) -> extract to tags: string[]
  const tags: string[] = [];
  const tagRegex = /#([\w-]+)/g;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    if (!tags.includes(tagMatch[1])) {
      tags.push(tagMatch[1]);
    }
  }
  text = text.replace(/#[\w-]+/g, " ");

  // 2. Priority detection
  // Detect `!1`, `p:high`, `p:1`, `high`, `urgent` -> `priority: "high"`
  // Detect `!2`, `p:medium`, `p:2`, `medium` -> `priority: "medium"`
  // Detect `!3`, `p:low`, `p:3`, `low` -> `priority: "low"`
  // Default: `"medium"`
  let priority: "low" | "medium" | "high" = "medium";

  // Check explicit priority prefixes: !1, !2, !3, p:high, p:medium, p:low, p:1, p:2, p:3
  const explicitPriorityMatch = text.match(/(?:^|\s)(!([123])|p:(high|medium|low|[123]))(?=\s|$)/i);
  if (explicitPriorityMatch) {
    const val = (explicitPriorityMatch[2] || explicitPriorityMatch[3]).toLowerCase();
    if (val === "1" || val === "high") {
      priority = "high";
    } else if (val === "3" || val === "low") {
      priority = "low";
    } else if (val === "2" || val === "medium") {
      priority = "medium";
    }
    text = text.replace(/(?:^|\s)(![123]|p:(?:high|medium|low|[123]))(?=\s|$)/i, " ");
  }

  // Check for "priority: high|medium|low"
  const priorityColonMatch = text.match(/(?:^|\s)priority:\s*(high|medium|low|[123])(?=\s|$)/i);
  if (priorityColonMatch) {
    const val = priorityColonMatch[1].toLowerCase();
    if (val === "1" || val === "high") priority = "high";
    else if (val === "3" || val === "low") priority = "low";
    else if (val === "2" || val === "medium") priority = "medium";
    text = text.replace(/(?:^|\s)priority:\s*(?:high|medium|low|[123])(?=\s|$)/i, " ");
  }

  // Check for "(high|medium|low) priority"
  const phrasePriorityMatch = text.match(/\b(high|medium|low)[-\s]+priority\b/i);
  if (phrasePriorityMatch) {
    const val = phrasePriorityMatch[1].toLowerCase();
    if (val === "high") priority = "high";
    else if (val === "low") priority = "low";
    else if (val === "medium") priority = "medium";
    text = text.replace(/\b(high|medium|low)[-\s]+priority\b/i, " ");
  }

  // Check for "urgent"
  if (/\burgent\b/i.test(text)) {
    priority = "high";
    text = text.replace(/\burgent\b/gi, " ");
  }

  // Check standalone priority words (high, medium, low)
  const standaloneMatch = text.match(/\b(high|medium|low)\b/i);
  if (standaloneMatch) {
    const val = standaloneMatch[1].toLowerCase();
    if (!explicitPriorityMatch && !phrasePriorityMatch) {
      if (val === "high") priority = "high";
      else if (val === "low") priority = "low";
      else if (val === "medium") priority = "medium";
    }
    text = text.replace(/\b(high|medium|low)\b/gi, " ");
  }

  // 3. Time detection
  let dueTime: string | null = null;

  // Pattern A: "at HH:mm [am|pm]" or "at HH [am|pm]"
  const atTimeMatch = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (atTimeMatch) {
    const parsed = parseTime(atTimeMatch[1], atTimeMatch[2], atTimeMatch[3]);
    if (parsed) {
      dueTime = parsed;
      text = text.replace(atTimeMatch[0], " ");
    }
  }

  // Pattern B: "at HH:mm" (24-hour time with "at")
  if (!dueTime) {
    const at24Match = text.match(/\bat\s+(\d{1,2}):(\d{2})\b/i);
    if (at24Match) {
      const parsed = parseTime(at24Match[1], at24Match[2], undefined);
      if (parsed) {
        dueTime = parsed;
        text = text.replace(at24Match[0], " ");
      }
    }
  }

  // Pattern C: "at HH" (e.g. "at 3") not followed by quantity words
  if (!dueTime) {
    const atSimpleMatch = text.match(
      /\bat\s+(\d{1,2})\b(?!\s*(?:days?|weeks?|months?|years?|items?|bugs?|tasks?|photos?|pics?|files?|people))/i
    );
    if (atSimpleMatch) {
      const parsed = parseTime(atSimpleMatch[1], undefined, undefined);
      if (parsed) {
        dueTime = parsed;
        text = text.replace(atSimpleMatch[0], " ");
      }
    }
  }

  // Pattern D: "HH:mm [am|pm]" without "at"
  if (!dueTime) {
    const timeColonMatch = text.match(/\b(\d{1,2}):(\d{2})(?:\s*(am|pm))?\b/i);
    if (timeColonMatch) {
      const parsed = parseTime(timeColonMatch[1], timeColonMatch[2], timeColonMatch[3]);
      if (parsed) {
        dueTime = parsed;
        text = text.replace(timeColonMatch[0], " ");
      }
    }
  }

  // Pattern E: "HHam" or "HHpm" or "HH am" or "HH pm"
  if (!dueTime) {
    const ampmMatch = text.match(/\b(\d{1,2})\s*(am|pm)\b/i);
    if (ampmMatch) {
      const parsed = parseTime(ampmMatch[1], undefined, ampmMatch[2]);
      if (parsed) {
        dueTime = parsed;
        text = text.replace(ampmMatch[0], " ");
      }
    }
  }

  // 4. Date detection
  let dueDate: string | null = null;

  // "in (\d+) days"
  const inDaysMatch = text.match(/\bin\s+(\d+)\s+days?\b/i);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const targetDate = new Date(referenceDate);
    targetDate.setDate(targetDate.getDate() + days);
    dueDate = formatDate(targetDate);
    text = text.replace(inDaysMatch[0], " ");
  }

  // "today" / "tonight"
  if (!dueDate) {
    const todayMatch = text.match(/\b(today|tonight)\b/i);
    if (todayMatch) {
      dueDate = formatDate(referenceDate);
      text = text.replace(todayMatch[0], " ");
    }
  }

  // "tomorrow"
  if (!dueDate) {
    const tomorrowMatch = text.match(/\btomorrow\b/i);
    if (tomorrowMatch) {
      const targetDate = new Date(referenceDate);
      targetDate.setDate(targetDate.getDate() + 1);
      dueDate = formatDate(targetDate);
      text = text.replace(tomorrowMatch[0], " ");
    }
  }

  // Weekdays: "monday", "tuesday", etc., optionally with "on", "next", "this"
  if (!dueDate) {
    const weekdayMatch = text.match(
      /\b(?:on\s+)?(?:next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
    );
    if (weekdayMatch) {
      const dayName = weekdayMatch[1].toLowerCase();
      const targetDay = WEEKDAYS[dayName];
      const currentDay = referenceDate.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) {
        diff += 7;
      }
      const targetDate = new Date(referenceDate);
      targetDate.setDate(targetDate.getDate() + diff);
      dueDate = formatDate(targetDate);
      text = text.replace(weekdayMatch[0], " ");
    }
  }

  // 5. Clean Title normalization
  let cleanTitle = text
    .replace(/\[\s*\]|\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, "")
    .trim();

  // If resulting title is empty, fallback to input
  if (!cleanTitle) {
    cleanTitle = input.trim();
  }

  return {
    cleanTitle,
    dueDate,
    dueTime,
    priority,
    tags,
  };
}
