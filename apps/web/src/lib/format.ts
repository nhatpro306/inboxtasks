export function parseLocalDate(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z?$/.test(iso)) {
    const [datePart] = iso.split("T");
    const [y, m, d] = datePart.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(iso);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = parseLocalDate(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtDay(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = parseLocalDate(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function isOverdue(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = parseLocalDate(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = parseLocalDate(iso);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

export function hasTime(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const trimmed = iso.trim();
  if (!trimmed.includes("T") && !trimmed.includes(" ") && !trimmed.includes(":")) {
    return false;
  }
  if (/[T ]00:00(:00(\.000)?)?(Z|[+-]\d{2}:?\d{2})?$/i.test(trimmed)) {
    return false;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return false;
  return d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0 || d.getHours() !== 0 || d.getMinutes() !== 0;
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  if (!hasTime(iso)) return fmtDate(iso);
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${datePart} · ${fmtTime(iso)}`;
}

