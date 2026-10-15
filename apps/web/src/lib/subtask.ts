export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface SubtaskParseResult {
  cleanDescription: string;
  subtasks: SubtaskItem[];
  progressPercent: number;
  completedCount: number;
  totalCount: number;
}

export function parseSubtasks(rawDescription: string | null | undefined): SubtaskParseResult {
  if (!rawDescription) {
    return { cleanDescription: "", subtasks: [], progressPercent: 0, completedCount: 0, totalCount: 0 };
  }
  const lines = rawDescription.replace(/\r\n/g, "\n").split("\n");
  const subtasks: SubtaskItem[] = [];
  const cleanLines: string[] = [];

  lines.forEach((line, index) => {
    const match = line.match(/^\s*[-*]\s*\[([ xX])\]\s*(.*)$/);
    if (match) {
      subtasks.push({
        id: `sub-${index}`,
        title: match[2].trim(),
        completed: match[1].toLowerCase() === "x",
      });
    } else {
      cleanLines.push(line);
    }
  });

  const totalCount = subtasks.length;
  const completedCount = subtasks.filter((s) => s.completed).length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    cleanDescription: cleanLines.join("\n").trim(),
    subtasks,
    progressPercent,
    completedCount,
    totalCount,
  };
}

export function serializeSubtasks(cleanDescription: string | null | undefined, subtasks: SubtaskItem[]): string {
  const parts: string[] = [];
  if (cleanDescription && cleanDescription.trim()) {
    parts.push(cleanDescription.trim());
  }
  if (subtasks && subtasks.length > 0) {
    if (parts.length > 0) parts.push("");
    subtasks.forEach((s) => {
      parts.push(`- [${s.completed ? "x" : " "}] ${s.title}`);
    });
  }
  return parts.join("\n");
}
