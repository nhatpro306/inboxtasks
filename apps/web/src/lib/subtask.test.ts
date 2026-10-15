import { describe, it, expect } from "vitest";
import { parseSubtasks, serializeSubtasks, SubtaskItem } from "./subtask.js";

describe("subtask", () => {
  describe("parseSubtasks", () => {
    it("handles null, undefined, and empty string", () => {
      const emptyResult = {
        cleanDescription: "",
        subtasks: [],
        progressPercent: 0,
        completedCount: 0,
        totalCount: 0,
      };

      expect(parseSubtasks(null)).toEqual(emptyResult);
      expect(parseSubtasks(undefined)).toEqual(emptyResult);
      expect(parseSubtasks("")).toEqual(emptyResult);
    });

    it("parses standard dash checklist items (- [ ] and - [x])", () => {
      const input = "- [ ] First task\n- [x] Second task\n- [X] Third task";
      const result = parseSubtasks(input);

      expect(result.totalCount).toBe(3);
      expect(result.completedCount).toBe(2);
      expect(result.progressPercent).toBe(67);
      expect(result.cleanDescription).toBe("");
      expect(result.subtasks).toEqual([
        { id: "sub-0", title: "First task", completed: false },
        { id: "sub-1", title: "Second task", completed: true },
        { id: "sub-2", title: "Third task", completed: true },
      ]);
    });

    it("parses asterisk checklist items (* [ ] and * [x])", () => {
      const input = "* [ ] Item one\n* [x] Item two\n* [X] Item three";
      const result = parseSubtasks(input);

      expect(result.totalCount).toBe(3);
      expect(result.completedCount).toBe(2);
      expect(result.progressPercent).toBe(67);
      expect(result.cleanDescription).toBe("");
      expect(result.subtasks).toEqual([
        { id: "sub-0", title: "Item one", completed: false },
        { id: "sub-1", title: "Item two", completed: true },
        { id: "sub-2", title: "Item three", completed: true },
      ]);
    });

    it("preserves multiline description text before and after checklists", () => {
      const input = [
        "Header paragraph with important details.",
        "Second line of context.",
        "",
        "- [ ] Checklist item 1",
        "- [x] Checklist item 2",
        "",
        "Footer notes below the checklist.",
        "Additional follow-up instructions.",
      ].join("\n");

      const result = parseSubtasks(input);

      expect(result.totalCount).toBe(2);
      expect(result.completedCount).toBe(1);
      expect(result.progressPercent).toBe(50);
      expect(result.subtasks).toEqual([
        { id: "sub-3", title: "Checklist item 1", completed: false },
        { id: "sub-4", title: "Checklist item 2", completed: true },
      ]);
      expect(result.cleanDescription).toBe(
        "Header paragraph with important details.\nSecond line of context.\n\n\nFooter notes below the checklist.\nAdditional follow-up instructions."
      );
    });

    it("handles description with only non-checklist text", () => {
      const input = "Just regular note text.\nAnother line.";
      const result = parseSubtasks(input);

      expect(result.totalCount).toBe(0);
      expect(result.completedCount).toBe(0);
      expect(result.progressPercent).toBe(0);
      expect(result.subtasks).toEqual([]);
      expect(result.cleanDescription).toBe(input);
    });

    it("handles CRLF newlines correctly", () => {
      const input = "Line one\r\n- [ ] Task 1\r\n- [x] Task 2\r\nLine two";
      const result = parseSubtasks(input);

      expect(result.totalCount).toBe(2);
      expect(result.completedCount).toBe(1);
      expect(result.subtasks[0].title).toBe("Task 1");
      expect(result.subtasks[1].title).toBe("Task 2");
    });

    describe("progressPercent calculations", () => {
      it("calculates 0/3 (0%)", () => {
        const input = "- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3";
        const result = parseSubtasks(input);
        expect(result.totalCount).toBe(3);
        expect(result.completedCount).toBe(0);
        expect(result.progressPercent).toBe(0);
      });

      it("calculates 1/3 (33%)", () => {
        const input = "- [x] Task 1\n- [ ] Task 2\n- [ ] Task 3";
        const result = parseSubtasks(input);
        expect(result.totalCount).toBe(3);
        expect(result.completedCount).toBe(1);
        expect(result.progressPercent).toBe(33);
      });

      it("calculates 2/3 (67%)", () => {
        const input = "- [x] Task 1\n- [x] Task 2\n- [ ] Task 3";
        const result = parseSubtasks(input);
        expect(result.totalCount).toBe(3);
        expect(result.completedCount).toBe(2);
        expect(result.progressPercent).toBe(67);
      });

      it("calculates 3/3 (100%)", () => {
        const input = "- [x] Task 1\n- [x] Task 2\n- [x] Task 3";
        const result = parseSubtasks(input);
        expect(result.totalCount).toBe(3);
        expect(result.completedCount).toBe(3);
        expect(result.progressPercent).toBe(100);
      });

      it("returns 0% when there are no subtasks", () => {
        const input = "No subtasks here";
        const result = parseSubtasks(input);
        expect(result.progressPercent).toBe(0);
      });
    });
  });

  describe("serializeSubtasks", () => {
    it("round-trips with clean description text and subtasks", () => {
      const description = "Review document specifications";
      const subtasks: SubtaskItem[] = [
        { id: "sub-1", title: "Section A review", completed: false },
        { id: "sub-2", title: "Section B review", completed: true },
      ];

      const serialized = serializeSubtasks(description, subtasks);
      expect(serialized).toBe(
        "Review document specifications\n\n- [ ] Section A review\n- [x] Section B review"
      );

      const parsed = parseSubtasks(serialized);
      expect(parsed.cleanDescription).toBe(description);
      expect(parsed.subtasks[0].title).toBe("Section A review");
      expect(parsed.subtasks[0].completed).toBe(false);
      expect(parsed.subtasks[1].title).toBe("Section B review");
      expect(parsed.subtasks[1].completed).toBe(true);
    });

    it("round-trips without clean description text", () => {
      const subtasks: SubtaskItem[] = [
        { id: "sub-0", title: "Buy groceries", completed: false },
        { id: "sub-1", title: "Cook dinner", completed: true },
      ];

      const serialized = serializeSubtasks("", subtasks);
      expect(serialized).toBe("- [ ] Buy groceries\n- [x] Cook dinner");

      const parsed = parseSubtasks(serialized);
      expect(parsed.cleanDescription).toBe("");
      expect(parsed.subtasks[0].title).toBe("Buy groceries");
      expect(parsed.subtasks[0].completed).toBe(false);
      expect(parsed.subtasks[1].title).toBe("Cook dinner");
      expect(parsed.subtasks[1].completed).toBe(true);
    });

    it("serializes correctly when description is null or undefined", () => {
      const subtasks: SubtaskItem[] = [
        { id: "sub-0", title: "Test item", completed: false },
      ];

      expect(serializeSubtasks(null, subtasks)).toBe("- [ ] Test item");
      expect(serializeSubtasks(undefined, subtasks)).toBe("- [ ] Test item");
    });

    it("serializes correctly when subtasks array is empty", () => {
      expect(serializeSubtasks("Only description", [])).toBe("Only description");
      expect(serializeSubtasks("", [])).toBe("");
      expect(serializeSubtasks(null, [])).toBe("");
    });
  });
});
