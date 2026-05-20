export function formatTrustFraudDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatTrustFraudDateTime(value?: string | null): string {
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

export function formatTrustFraudId(value?: string | null): string {
  if (!value) return "—";
  if (value.length <= 12) return value;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

export function formatTrustFraudLabel(value?: string | null): string {
  if (!value) return "—";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatTrustFraudPercent(value?: number | string | null): string {
  const number = typeof value === "string" ? Number(value) : value;
  if (number === null || number === undefined || Number.isNaN(number)) return "—";
  return `${Math.round(number * 100)}%`;
}
