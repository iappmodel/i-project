export function formatDateTime(value?: string | null): string {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatShortId(value?: string | null): string {
  if (!value) return "—";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function formatCaseType(value?: string | null): string {
  if (!value) return "—";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export function numberToPercent(value?: number | null): string {
  if (typeof value !== "number") return "—";
  return `${Math.round(value * 100)}%`;
}
