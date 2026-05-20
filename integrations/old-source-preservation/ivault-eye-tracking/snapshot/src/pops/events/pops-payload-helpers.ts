const FORBIDDEN_PAYLOAD_KEYS = new Set<string>([
  "presenceConfidence",
  "attentionConfidence",
  "intentConfidence",
  "continuityConfidence",
  "fraudRisk",
  "rewardEligibility",
  "rewardDecision",
  "walletStatus",
  "rawCamera",
  "rawCameraFrame",
  "rawAudio",
  "rawAudioSample",
  "rawLocation",
  "preciseLocation",
  "biometricTemplate",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getNumberPayload(
  payload: Record<string, unknown> | undefined,
  key: string,
  fallback = 0,
): number {
  if (!payload) return fallback;
  const v = payload[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function getBooleanPayload(
  payload: Record<string, unknown> | undefined,
  key: string,
  fallback = false,
): boolean {
  if (!payload) return fallback;
  const v = payload[key];
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

export function getStringPayload(
  payload: Record<string, unknown> | undefined,
  key: string,
  fallback = "",
): string {
  if (!payload) return fallback;
  const v = payload[key];
  if (typeof v === "string") return v;
  if (v === undefined || v === null) return fallback;
  return String(v);
}

export function getProgressPayload(payload: Record<string, unknown> | undefined): number {
  const n = getNumberPayload(payload, "contentProgressPct", 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export function getContentPositionPayload(payload: Record<string, unknown> | undefined): number {
  const n = getNumberPayload(payload, "contentPositionMs", 0);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/**
 * Returns a shallow copy of payload with forbidden client / raw media keys removed.
 */
export function sanitizePopsPayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!payload) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (FORBIDDEN_PAYLOAD_KEYS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Deep-sanitizes nested record values one level (payload values that are plain objects).
 */
export function sanitizePopsPayloadDeep(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  const shallow = sanitizePopsPayload(payload);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(shallow)) {
    if (isRecord(v)) {
      out[k] = sanitizePopsPayload(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
