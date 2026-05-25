import type { Point } from "../core/types";

export type CalibrationCapture = {
  raw: Point;
  target: Point;
};

export type CalibrationProfile = {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  affineParams?: [number, number, number, number, number, number];
  quality: number;
  calibratedAt: number;
  captureCount: number;
  version: 1;
};

export const CALIBRATION_STORAGE_KEY = "vision_v2_calibration_profile";
export const DEFAULT_CALIBRATION_SLOT = "global";

export const DEFAULT_CALIBRATION_PROFILE: CalibrationProfile = {
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
  quality: 0.4,
  calibratedAt: 0,
  captureCount: 0,
  version: 1
};

export const CALIBRATION_TARGETS: Point[] = [
  { x: 0.1, y: 0.1 },
  { x: 0.5, y: 0.1 },
  { x: 0.9, y: 0.1 },
  { x: 0.1, y: 0.5 },
  { x: 0.5, y: 0.5 },
  { x: 0.9, y: 0.5 },
  { x: 0.1, y: 0.9 },
  { x: 0.5, y: 0.9 },
  { x: 0.9, y: 0.9 }
];

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

type CalibrationStore = {
  version: 1;
  slots: Record<string, CalibrationProfile>;
};

export type DriftAssessment = {
  error: number;
  level: "low" | "medium" | "high";
  recommendedAction: string;
};

function solve3x3(M: number[][], v: number[]): [number, number, number] | null {
  const a = M.map((row) => [...row]);
  const b = [...v];
  for (let col = 0; col < 3; col++) {
    let maxRow = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(a[r][col]) > Math.abs(a[maxRow][col])) maxRow = r;
    }
    [a[col], a[maxRow]] = [a[maxRow], a[col]];
    [b[col], b[maxRow]] = [b[maxRow], b[col]];
    if (Math.abs(a[col][col]) < 1e-10) return null;

    for (let r = col + 1; r < 3; r++) {
      const factor = a[r][col] / a[col][col];
      for (let c = col; c < 3; c++) a[r][c] -= factor * a[col][c];
      b[r] -= factor * b[col];
    }
  }

  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < 3; j++) sum -= a[i][j] * x[j];
    x[i] = sum / a[i][i];
  }
  return [x[0], x[1], x[2]];
}

function fitAffine(captures: CalibrationCapture[]): [number, number, number, number, number, number] | null {
  if (captures.length < 6) return null;
  const AtA = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ];
  const AtbX = [0, 0, 0];
  const AtbY = [0, 0, 0];

  for (const c of captures) {
    const row = [c.raw.x, c.raw.y, 1];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) AtA[i][j] += row[i] * row[j];
      AtbX[i] += row[i] * c.target.x;
      AtbY[i] += row[i] * c.target.y;
    }
  }

  const abc = solve3x3(AtA, AtbX);
  const def = solve3x3(AtA, AtbY);
  return abc && def ? ([...abc, ...def] as [number, number, number, number, number, number]) : null;
}

export function applyCalibration(raw: Point, profile: CalibrationProfile): Point {
  if (profile.affineParams) {
    const [a, b, c, d, e, f] = profile.affineParams;
    return {
      x: clamp01(a * raw.x + b * raw.y + c),
      y: clamp01(d * raw.x + e * raw.y + f)
    };
  }
  return {
    x: clamp01((raw.x - 0.5) * profile.scaleX + 0.5 + profile.offsetX),
    y: clamp01((raw.y - 0.5) * profile.scaleY + 0.5 + profile.offsetY)
  };
}

export function computeCalibrationError(captures: CalibrationCapture[], profile: CalibrationProfile): number {
  if (!captures.length) return 1;
  const sum = captures.reduce((acc, capture) => {
    const corrected = applyCalibration(capture.raw, profile);
    const dx = corrected.x - capture.target.x;
    const dy = corrected.y - capture.target.y;
    return acc + Math.sqrt(dx * dx + dy * dy);
  }, 0);
  return sum / captures.length;
}

export function buildCalibrationProfile(
  captures: CalibrationCapture[],
  previous: CalibrationProfile = DEFAULT_CALIBRATION_PROFILE
): CalibrationProfile {
  if (!captures.length) return previous;

  const next: CalibrationProfile = {
    ...previous,
    calibratedAt: Date.now(),
    captureCount: captures.length,
    version: 1
  };

  const affine = fitAffine(captures);
  if (affine) {
    next.affineParams = affine;
  } else {
    const avgRawX = captures.reduce((a, c) => a + c.raw.x, 0) / captures.length;
    const avgRawY = captures.reduce((a, c) => a + c.raw.y, 0) / captures.length;
    const avgTargetX = captures.reduce((a, c) => a + c.target.x, 0) / captures.length;
    const avgTargetY = captures.reduce((a, c) => a + c.target.y, 0) / captures.length;

    const rawRangeX = Math.max(...captures.map((c) => c.raw.x)) - Math.min(...captures.map((c) => c.raw.x));
    const rawRangeY = Math.max(...captures.map((c) => c.raw.y)) - Math.min(...captures.map((c) => c.raw.y));
    const targetRangeX = Math.max(...captures.map((c) => c.target.x)) - Math.min(...captures.map((c) => c.target.x));
    const targetRangeY = Math.max(...captures.map((c) => c.target.y)) - Math.min(...captures.map((c) => c.target.y));

    const scaleX = rawRangeX > 0.03 ? targetRangeX / rawRangeX : 1;
    const scaleY = rawRangeY > 0.03 ? targetRangeY / rawRangeY : 1;

    next.scaleX = Math.max(0.65, Math.min(1.8, scaleX));
    next.scaleY = Math.max(0.65, Math.min(1.8, scaleY));
    next.offsetX = avgTargetX - ((avgRawX - 0.5) * next.scaleX + 0.5);
    next.offsetY = avgTargetY - ((avgRawY - 0.5) * next.scaleY + 0.5);
    delete next.affineParams;
  }

  const error = computeCalibrationError(captures, next);
  next.quality = Math.max(0, Math.min(1, 1 - error * 2.4));
  return next;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeProfile = (value: unknown): CalibrationProfile => {
  if (!value || typeof value !== "object") return DEFAULT_CALIBRATION_PROFILE;
  const parsed = value as Partial<CalibrationProfile>;
  return {
    ...DEFAULT_CALIBRATION_PROFILE,
    ...parsed,
    offsetX: isFiniteNumber(parsed.offsetX) ? parsed.offsetX : DEFAULT_CALIBRATION_PROFILE.offsetX,
    offsetY: isFiniteNumber(parsed.offsetY) ? parsed.offsetY : DEFAULT_CALIBRATION_PROFILE.offsetY,
    scaleX: isFiniteNumber(parsed.scaleX) ? parsed.scaleX : DEFAULT_CALIBRATION_PROFILE.scaleX,
    scaleY: isFiniteNumber(parsed.scaleY) ? parsed.scaleY : DEFAULT_CALIBRATION_PROFILE.scaleY,
    quality: isFiniteNumber(parsed.quality) ? parsed.quality : DEFAULT_CALIBRATION_PROFILE.quality,
    calibratedAt: isFiniteNumber(parsed.calibratedAt) ? parsed.calibratedAt : 0,
    captureCount: isFiniteNumber(parsed.captureCount) ? parsed.captureCount : 0,
    affineParams:
      Array.isArray(parsed.affineParams) && parsed.affineParams.length === 6
        ? (parsed.affineParams as [number, number, number, number, number, number])
        : undefined
  };
};

const normalizeStore = (value: unknown): CalibrationStore => {
  if (!value || typeof value !== "object") {
    return { version: 1, slots: {} };
  }

  const parsed = value as Record<string, unknown>;

  // Backward compatibility with legacy single-profile storage.
  if (isFiniteNumber(parsed.offsetX) && isFiniteNumber(parsed.scaleX)) {
    return {
      version: 1,
      slots: {
        [DEFAULT_CALIBRATION_SLOT]: normalizeProfile(parsed)
      }
    };
  }

  const slots: Record<string, CalibrationProfile> = {};
  const rawSlots = parsed.slots;
  if (rawSlots && typeof rawSlots === "object") {
    for (const [slot, profile] of Object.entries(rawSlots as Record<string, unknown>)) {
      slots[slot] = normalizeProfile(profile);
    }
  }
  return { version: 1, slots };
};

const loadStore = (): CalibrationStore => {
  try {
    const raw = localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (!raw) return { version: 1, slots: {} };
    return normalizeStore(JSON.parse(raw));
  } catch {
    return { version: 1, slots: {} };
  }
};

const saveStore = (store: CalibrationStore): void => {
  localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(store));
};

export function loadCalibrationProfile(slot = DEFAULT_CALIBRATION_SLOT): CalibrationProfile {
  const store = loadStore();
  return store.slots[slot] ?? DEFAULT_CALIBRATION_PROFILE;
}

export function listCalibrationSlots(): string[] {
  return Object.keys(loadStore().slots).sort();
}

export function saveCalibrationProfile(profile: CalibrationProfile, slot = DEFAULT_CALIBRATION_SLOT): void {
  const store = loadStore();
  store.slots[slot] = normalizeProfile(profile);
  saveStore(store);
}

export function clearCalibrationProfile(slot?: string): CalibrationProfile {
  if (!slot) {
    localStorage.removeItem(CALIBRATION_STORAGE_KEY);
    return DEFAULT_CALIBRATION_PROFILE;
  }

  const store = loadStore();
  delete store.slots[slot];
  saveStore(store);
  return DEFAULT_CALIBRATION_PROFILE;
}

export function assessCalibrationDrift(captures: CalibrationCapture[], profile: CalibrationProfile): DriftAssessment {
  if (!captures.length) {
    return {
      error: 0,
      level: "low",
      recommendedAction: "Collect more dwell samples for drift estimation."
    };
  }
  const error = computeCalibrationError(captures, profile);
  if (error <= 0.06) {
    return { error, level: "low", recommendedAction: "No action needed." };
  }
  if (error <= 0.12) {
    return {
      error,
      level: "medium",
      recommendedAction: "Run quick recalibration when convenient."
    };
  }
  return {
    error,
    level: "high",
    recommendedAction: "Recalibrate now and verify device position."
  };
}
