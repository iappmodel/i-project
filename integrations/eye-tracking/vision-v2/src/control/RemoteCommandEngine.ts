import type { Point } from "../core/types";
import { BLINK_ACTIONS, type RemoteAction, type RemoteTarget } from "./commands";

export type ActionMeta = {
  reason: "dwell" | "blink";
  targetId?: string;
};

type Options = {
  dwellMs: number;
  dwellCooldownMs?: number;
  blinkCooldownMs?: number;
  globalCooldownMs?: number;
  onAction: (action: RemoteAction, meta: ActionMeta) => void;
};

export class RemoteCommandEngine {
  private dwellMs: number;
  private dwellCooldownMs: number;
  private blinkCooldownMs: number;
  private globalCooldownMs: number;
  private onAction: Options["onAction"];
  private activeTargetId: string | null = null;
  private activeSince = 0;
  private lastTriggerAtByKey = new Map<string, number>();
  private lastGlobalActionAt = 0;

  constructor(options: Options) {
    this.dwellMs = options.dwellMs;
    this.dwellCooldownMs = options.dwellCooldownMs ?? 600;
    this.blinkCooldownMs = options.blinkCooldownMs ?? 260;
    this.globalCooldownMs = options.globalCooldownMs ?? 140;
    this.onAction = options.onAction;
  }

  setDwellMs(ms: number): void {
    this.dwellMs = Math.max(150, ms);
  }

  setCooldowns(options: { dwellCooldownMs?: number; blinkCooldownMs?: number; globalCooldownMs?: number }): void {
    if (typeof options.dwellCooldownMs === "number") this.dwellCooldownMs = Math.max(100, options.dwellCooldownMs);
    if (typeof options.blinkCooldownMs === "number") this.blinkCooldownMs = Math.max(100, options.blinkCooldownMs);
    if (typeof options.globalCooldownMs === "number") this.globalCooldownMs = Math.max(0, options.globalCooldownMs);
  }

  updateGaze(point: Point, targets: RemoteTarget[], now = Date.now()): void {
    const hit = targets.find((target) => (
      point.x >= target.rect.left &&
      point.x <= target.rect.right &&
      point.y >= target.rect.top &&
      point.y <= target.rect.bottom
    ));

    if (!hit) {
      this.activeTargetId = null;
      this.activeSince = 0;
      return;
    }

    if (this.activeTargetId !== hit.id) {
      this.activeTargetId = hit.id;
      this.activeSince = now;
      return;
    }

    const elapsed = now - this.activeSince;
    if (elapsed >= this.dwellMs) {
      this.tryTrigger(hit.action, { reason: "dwell", targetId: hit.id }, now, `dwell:${hit.id}`, this.dwellCooldownMs);
    }
  }

  registerBlink(blinkCount: number, currentTargetId?: string, now = Date.now()): void {
    const action = BLINK_ACTIONS[blinkCount];
    if (!action) return;
    const targetKey = currentTargetId ?? "none";
    this.tryTrigger(
      action,
      { reason: "blink", targetId: currentTargetId },
      now,
      `blink:${blinkCount}:${targetKey}`,
      this.blinkCooldownMs
    );
  }

  private tryTrigger(
    action: RemoteAction,
    meta: ActionMeta,
    now: number,
    key: string,
    cooldownMs: number
  ): void {
    if (now - this.lastGlobalActionAt < this.globalCooldownMs) return;
    const lastForKey = this.lastTriggerAtByKey.get(key) ?? 0;
    if (now - lastForKey < cooldownMs) return;
    this.lastGlobalActionAt = now;
    this.lastTriggerAtByKey.set(key, now);
    this.onAction(action, meta);
  }
}
