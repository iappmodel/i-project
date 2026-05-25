import { GazeProviderBase } from "./GazeProviderBase";

export class MockGazeProvider extends GazeProviderBase {
  id = "mock";
  label = "Mock (deterministic)";
  requiresUserCalibration = false;

  private running = false;
  private rafId: number | null = null;
  private startAt = 0;

  async connect(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.startAt = performance.now();
    this.emitState({ status: "ready", message: "Mock feed active" });
    this.tick();
  }

  async disconnect(): Promise<void> {
    this.running = false;
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.emitState({ status: "stopped", message: "Mock feed stopped" });
  }

  private tick = () => {
    if (!this.running) return;
    const t = (performance.now() - this.startAt) / 1000;
    const x = 0.5 + Math.sin(t * 0.9) * 0.35;
    const y = 0.5 + Math.cos(t * 1.2) * 0.28;
    this.emitSample({
      timestamp: Date.now(),
      raw: { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) },
      confidence: 0.95,
      source: this.id
    });
    this.rafId = requestAnimationFrame(this.tick);
  };
}

