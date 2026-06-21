export function maskSecret(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return "••••" + value.slice(-4);
}

export function isDueWithin(dueDate: Date | null | undefined, now: Date, leadMinutes: number): boolean {
  if (dueDate == null) return false;
  const due = dueDate.getTime();
  const start = now.getTime();
  const end = start + leadMinutes * 60000;
  return due >= start && due <= end;
}
