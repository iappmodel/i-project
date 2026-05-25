import { GazeProviderBase } from "./GazeProviderBase";
import type { Point } from "../core/types";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

type Candidate = {
  x?: unknown;
  y?: unknown;
};

const parsePoint = (payload: unknown): Point | null => {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const candidates: Candidate[] = [
    { x: p.x, y: p.y },
    { x: p.gx, y: p.gy },
    { x: p.GazeX, y: p.GazeY },
    { x: (p.gaze as Record<string, unknown> | undefined)?.x, y: (p.gaze as Record<string, unknown> | undefined)?.y },
    { x: (p.data as Record<string, unknown> | undefined)?.x, y: (p.data as Record<string, unknown> | undefined)?.y },
    { x: (p.raw as Record<string, unknown> | undefined)?.x, y: (p.raw as Record<string, unknown> | undefined)?.y }
  ];

  for (const c of candidates) {
    if (typeof c.x === "number" && typeof c.y === "number" && Number.isFinite(c.x) && Number.isFinite(c.y)) {
      // Accept normalized and pixel coordinates.
      if (c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1) return { x: c.x, y: c.y };
      const w = Math.max(window.innerWidth, 1);
      const h = Math.max(window.innerHeight, 1);
      return { x: clamp01(c.x / w), y: clamp01(c.y / h) };
    }
  }

  return null;
};

const parseConfidence = (payload: unknown): number => {
  if (!payload || typeof payload !== "object") return 0.5;
  const p = payload as Record<string, unknown>;
  const v = p.confidence ?? p.quality ?? p.validity;
  if (typeof v === "number" && Number.isFinite(v)) {
    return v > 1 ? clamp01(v / 100) : clamp01(v);
  }
  return 0.7;
};

const parseBlinkCount = (payload: unknown): number | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const p = payload as Record<string, unknown>;
  const value = p.blinkCount ?? (p.blink as Record<string, unknown> | undefined)?.count;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
};

export class TobiiWebSocketProvider extends GazeProviderBase {
  id = "tobii_ws";
  label = "Tobii WebSocket (local bridge)";
  requiresUserCalibration = true;

  private ws: WebSocket | null = null;
  private url: string;

  constructor(url = "ws://127.0.0.1:8765") {
    super();
    this.url = url;
  }

  setUrl(url: string): void {
    this.url = url.trim();
  }

  async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    this.emitState({ status: "connecting", message: `Connecting to ${this.url}` });

    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.onopen = () => {
        this.emitState({ status: "ready", message: `Connected: ${this.url}` });
        resolve();
      };

      ws.onerror = () => {
        this.emitState({ status: "error", message: `Connection error: ${this.url}` });
      };

      ws.onclose = () => {
        if (this.ws) this.emitState({ status: "stopped", message: "Socket closed" });
      };

      ws.onmessage = (event) => {
        const text = typeof event.data === "string" ? event.data : "";
        if (!text) return;
        try {
          const payload = JSON.parse(text);
          const point = parsePoint(payload);
          if (!point) return;
          this.emitSample({
            timestamp: Date.now(),
            raw: point,
            confidence: parseConfidence(payload),
            source: this.id,
            blinkCount: parseBlinkCount(payload)
          });
        } catch {
          // ignore malformed packets
        }
      };

      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          try {
            ws.close();
          } catch {
            // ignore close errors
          }
          reject(new Error(`Timeout connecting to ${this.url}`));
        }
      }, 3500);
    }).catch((error) => {
      this.emitState({ status: "error", message: (error as Error).message });
      throw error;
    });
  }

  async disconnect(): Promise<void> {
    if (!this.ws) return;
    const ws = this.ws;
    this.ws = null;
    ws.close();
    this.emitState({ status: "stopped", message: "Disconnected" });
  }
}

