import { GazeProviderBase } from "./GazeProviderBase";

export class PointerGazeProvider extends GazeProviderBase {
  id = "pointer";
  label = "Pointer (manual fallback)";
  requiresUserCalibration = false;

  private active = false;

  async connect(): Promise<void> {
    if (this.active) return;
    this.active = true;
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    this.emitState({ status: "ready", message: "Pointer feed active" });
  }

  async disconnect(): Promise<void> {
    this.active = false;
    window.removeEventListener("pointermove", this.onPointerMove);
    this.emitState({ status: "stopped", message: "Pointer feed stopped" });
  }

  private onPointerMove = (event: PointerEvent) => {
    if (!this.active) return;
    const w = Math.max(window.innerWidth, 1);
    const h = Math.max(window.innerHeight, 1);
    this.emitSample({
      timestamp: Date.now(),
      raw: {
        x: Math.max(0, Math.min(1, event.clientX / w)),
        y: Math.max(0, Math.min(1, event.clientY / h))
      },
      confidence: 1,
      source: this.id
    });
  };
}

