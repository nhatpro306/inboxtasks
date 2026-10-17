import { describe, it, expect } from "vitest";
import { parseNaturalLanguageTask } from "./nlp.js";
import {
  categorizeEisenhower,
  isTaskUrgent,
  isTaskImportant,
  EISENHOWER_QUADRANTS,
} from "./eisenhower.js";
import { Task } from "./api.js";

describe("parseNaturalLanguageTask", () => {
  const fixedRefDate = new Date("2026-10-17T12:00:00"); // Saturday, Oct 17, 2026

  describe("Required Test Cases", () => {
    it("parses: Buy groceries tomorrow at 3pm p:high #personal", () => {
      const result = parseNaturalLanguageTask(
        "Buy groceries tomorrow at 3pm p:high #personal",
        fixedRefDate
      );
      expect(result.cleanTitle).toBe("Buy groceries");
      expect(result.priority).toBe("high");
      expect(result.tags).toEqual(["personal"]);
      expect(result.dueTime).toBe("15:00");
      expect(result.dueDate).toBe("2026-10-18");
    });

    it("parses: Submit quarterly taxes next Friday !1 #finance", () => {
      const result = parseNaturalLanguageTask(
        "Submit quarterly taxes next Friday !1 #finance",
        fixedRefDate
      );
      expect(result.cleanTitle).toBe("Submit quarterly taxes");
      expect(result.priority).toBe("high");
      expect(result.tags).toEqual(["finance"]);
      expect(result.dueDate).toBe("2026-10-23");
    });

    it("parses: Meeting with Sarah today at 10:30am", () => {
      const result = parseNaturalLanguageTask(
        "Meeting with Sarah today at 10:30am",
        fixedRefDate
      );
      expect(result.cleanTitle).toBe("Meeting with Sarah");
      expect(result.dueTime).toBe("10:30");
      expect(result.dueDate).toBe("2026-10-17");
      expect(result.priority).toBe("medium");
    });

    it("parses: Review design in 3 days", () => {
      const result = parseNaturalLanguageTask(
        "Review design in 3 days",
        fixedRefDate
      );
      expect(result.cleanTitle).toBe("Review design");
      expect(result.dueDate).toBe("2026-10-20");
      expect(result.dueTime).toBeNull();
      expect(result.priority).toBe("medium");
      expect(result.tags).toEqual([]);
    });

    it("parses: Simple task without date", () => {
      const result = parseNaturalLanguageTask("Simple task without date");
      expect(result.cleanTitle).toBe("Simple task without date");
      expect(result.priority).toBe("medium");
      expect(result.dueDate).toBeNull();
      expect(result.dueTime).toBeNull();
      expect(result.tags).toEqual([]);
    });

    it("parses: Quick bugfix low priority !3", () => {
      const result = parseNaturalLanguageTask("Quick bugfix low priority !3");
      expect(["Quick bugfix", "Quick bugfix low priority"]).toContain(result.cleanTitle);
      expect(result.priority).toBe("low");
      expect(result.dueDate).toBeNull();
      expect(result.dueTime).toBeNull();
    });
  });

  describe("Priorities", () => {
    it("detects !1, p:high, p:1, urgent, high as priority high", () => {
      expect(parseNaturalLanguageTask("Fix critical bug !1").priority).toBe("high");
      expect(parseNaturalLanguageTask("Fix critical bug p:high").priority).toBe("high");
      expect(parseNaturalLanguageTask("Fix critical bug p:1").priority).toBe("high");
      expect(parseNaturalLanguageTask("urgent server crash fix").priority).toBe("high");
      expect(parseNaturalLanguageTask("Server alert high").priority).toBe("high");
      expect(parseNaturalLanguageTask("high priority update").priority).toBe("high");
      expect(parseNaturalLanguageTask("priority: high Database indexing").priority).toBe("high");
    });

    it("detects !2, p:medium, p:2, medium as priority medium", () => {
      expect(parseNaturalLanguageTask("Refactor button component !2").priority).toBe("medium");
      expect(parseNaturalLanguageTask("Refactor button component p:medium").priority).toBe("medium");
      expect(parseNaturalLanguageTask("Refactor button component p:2").priority).toBe("medium");
      expect(parseNaturalLanguageTask("Refactor component medium").priority).toBe("medium");
      expect(parseNaturalLanguageTask("priority: medium Refactor component").priority).toBe("medium");
    });

    it("detects !3, p:low, p:3, low as priority low", () => {
      expect(parseNaturalLanguageTask("Update changelog !3").priority).toBe("low");
      expect(parseNaturalLanguageTask("Update changelog p:low").priority).toBe("low");
      expect(parseNaturalLanguageTask("Update changelog p:3").priority).toBe("low");
      expect(parseNaturalLanguageTask("Update changelog low").priority).toBe("low");
      expect(parseNaturalLanguageTask("priority: low Update changelog").priority).toBe("low");
    });

    it("defaults to medium when no priority indicator is present", () => {
      expect(parseNaturalLanguageTask("Read a book").priority).toBe("medium");
    });
  });

  describe("Tags", () => {
    it("extracts multiple tags without '#' and deduplicates them", () => {
      const result = parseNaturalLanguageTask("File taxes #finance #taxes #work #finance");
      expect(result.tags).toEqual(["finance", "taxes", "work"]);
      expect(result.cleanTitle).toBe("File taxes");
    });

    it("supports hyphens and underscores in tags", () => {
      const result = parseNaturalLanguageTask("Sprint planning #q4-roadmap #team_alpha");
      expect(result.tags).toEqual(["q4-roadmap", "team_alpha"]);
      expect(result.cleanTitle).toBe("Sprint planning");
    });
  });

  describe("Dates and Times", () => {
    it("parses 'tonight' as referenceDate", () => {
      const result = parseNaturalLanguageTask("Watch movie tonight at 8pm", fixedRefDate);
      expect(result.dueDate).toBe("2026-10-17");
      expect(result.dueTime).toBe("20:00");
      expect(result.cleanTitle).toBe("Watch movie");
    });

    it("parses 'tomorrow'", () => {
      const result = parseNaturalLanguageTask("Dentist appointment tomorrow", fixedRefDate);
      expect(result.dueDate).toBe("2026-10-18");
      expect(result.cleanTitle).toBe("Dentist appointment");
    });

    it("parses 'in 5 days'", () => {
      const result = parseNaturalLanguageTask("Ship release in 5 days", fixedRefDate);
      expect(result.dueDate).toBe("2026-10-22");
      expect(result.cleanTitle).toBe("Ship release");
    });

    it("parses weekday occurrences accurately", () => {
      // fixedRefDate is Saturday 2026-10-17 (day 6)
      // Next Sunday (day 0) is 2026-10-18 (+1 day)
      expect(parseNaturalLanguageTask("Brunch Sunday", fixedRefDate).dueDate).toBe("2026-10-18");
      // Next Monday (day 1) is 2026-10-19 (+2 days)
      expect(parseNaturalLanguageTask("Team standup Monday", fixedRefDate).dueDate).toBe("2026-10-19");
      // Next Tuesday (day 2) is 2026-10-20 (+3 days)
      expect(parseNaturalLanguageTask("Sprint retro next Tuesday", fixedRefDate).dueDate).toBe("2026-10-20");
      // Next Saturday (same day of week, +7 days)
      expect(parseNaturalLanguageTask("Long run next Saturday", fixedRefDate).dueDate).toBe("2026-10-24");
    });

    it("parses various time formats", () => {
      expect(parseNaturalLanguageTask("Standup at 9:30am").dueTime).toBe("09:30");
      expect(parseNaturalLanguageTask("Lunch at 12pm").dueTime).toBe("12:00");
      expect(parseNaturalLanguageTask("Late study at 12am").dueTime).toBe("00:00");
      expect(parseNaturalLanguageTask("Sync at 14:15").dueTime).toBe("14:15");
      expect(parseNaturalLanguageTask("Meeting 4pm").dueTime).toBe("16:00");
      expect(parseNaturalLanguageTask("Walk dog at 3pm").dueTime).toBe("15:00");
    });
  });

  describe("Clean title edge cases", () => {
    it("falls back to input if entire string is metadata tokens", () => {
      expect(parseNaturalLanguageTask("!1").cleanTitle).toBe("!1");
      expect(parseNaturalLanguageTask("#urgent").cleanTitle).toBe("#urgent");
      expect(parseNaturalLanguageTask("tomorrow").cleanTitle).toBe("tomorrow");
    });

    it("handles empty and whitespace strings gracefully", () => {
      const result = parseNaturalLanguageTask("   ");
      expect(result.cleanTitle).toBe("");
      expect(result.dueDate).toBeNull();
      expect(result.dueTime).toBeNull();
      expect(result.priority).toBe("medium");
      expect(result.tags).toEqual([]);
    });
  });
});

describe("eisenhower matrix", () => {
  const fixedNow = new Date("2026-10-17T10:00:00");

  const makeTask = (overrides: Partial<Task>): Task => ({
    id: "task-1",
    title: "Test Task",
    description: null,
    due_date: null,
    priority: "medium",
    status: "todo",
    created_via: "manual",
    ai_confidence: null,
    source_email_id: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...overrides,
  });

  describe("isTaskUrgent", () => {
    it("returns true for overdue tasks", () => {
      expect(isTaskUrgent("2026-10-10", fixedNow)).toBe(true);
    });

    it("returns true for tasks due today", () => {
      expect(isTaskUrgent("2026-10-17", fixedNow)).toBe(true);
    });

    it("returns true for tasks due within 48 hours (e.g. tomorrow)", () => {
      expect(isTaskUrgent("2026-10-18", fixedNow)).toBe(true);
      expect(isTaskUrgent("2026-10-19", fixedNow)).toBe(true);
    });

    it("returns false for tasks due far in the future", () => {
      expect(isTaskUrgent("2026-10-25", fixedNow)).toBe(false);
    });

    it("returns false when due_date is null", () => {
      expect(isTaskUrgent(null, fixedNow)).toBe(false);
    });
  });

  describe("isTaskImportant", () => {
    it("returns true for high priority tasks", () => {
      expect(isTaskImportant(makeTask({ priority: "high", due_date: null }))).toBe(true);
    });

    it("returns true for medium priority tasks with due date", () => {
      expect(isTaskImportant(makeTask({ priority: "medium", due_date: "2026-10-25" }))).toBe(true);
    });

    it("returns true for medium priority tasks with subtasks in description", () => {
      expect(
        isTaskImportant(
          makeTask({
            priority: "medium",
            due_date: null,
            description: "- [ ] Step 1\n- [ ] Step 2",
          })
        )
      ).toBe(true);
    });

    it("returns false for medium priority tasks without due date or subtasks", () => {
      expect(
        isTaskImportant(
          makeTask({
            priority: "medium",
            due_date: null,
            description: "Just general info",
          })
        )
      ).toBe(false);
    });

    it("returns false for low priority tasks", () => {
      expect(isTaskImportant(makeTask({ priority: "low", due_date: "2026-10-25" }))).toBe(false);
    });
  });

  describe("categorizeEisenhower", () => {
    it("categorizes tasks into correct quadrants", () => {
      const q1Task = makeTask({
        id: "q1",
        title: "Server down",
        priority: "high",
        due_date: "2026-10-17", // today & high -> Urgent & Important
      });

      const q2Task = makeTask({
        id: "q2",
        title: "Quarterly strategy",
        priority: "high",
        due_date: "2026-11-15", // far future & high -> Important & Not Urgent
      });

      const q3Task = makeTask({
        id: "q3",
        title: "Answer routine email",
        priority: "low",
        due_date: "2026-10-17", // today & low -> Urgent & Not Important
      });

      const q4Task = makeTask({
        id: "q4",
        title: "Browse social media",
        priority: "low",
        due_date: null, // no date & low -> Neither Urgent nor Important
      });

      const result = categorizeEisenhower([q1Task, q2Task, q3Task, q4Task], fixedNow);

      expect(result.do_first.map((t) => t.id)).toEqual(["q1"]);
      expect(result.schedule.map((t) => t.id)).toEqual(["q2"]);
      expect(result.delegate.map((t) => t.id)).toEqual(["q3"]);
      expect(result.dont_do.map((t) => t.id)).toEqual(["q4"]);
    });

    it("provides valid EISENHOWER_QUADRANTS metadata", () => {
      expect(EISENHOWER_QUADRANTS.do_first.badge).toBe("Q1");
      expect(EISENHOWER_QUADRANTS.schedule.badge).toBe("Q2");
      expect(EISENHOWER_QUADRANTS.delegate.badge).toBe("Q3");
      expect(EISENHOWER_QUADRANTS.dont_do.badge).toBe("Q4");
    });
  });
});
