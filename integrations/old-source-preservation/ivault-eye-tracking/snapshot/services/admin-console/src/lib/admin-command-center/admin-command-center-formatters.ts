export function formatCommandDate(value?: string | null): string {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium"
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatCommandDateTime(value?: string | null): string {
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

export function formatCommandId(value?: string | null): string {
  if (!value) return "—";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function formatCommandLabel(value?: string | null): string {
  if (!value) return "—";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
