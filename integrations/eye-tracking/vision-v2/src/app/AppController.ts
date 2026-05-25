import {
  CALIBRATION_TARGETS,
  DEFAULT_CALIBRATION_SLOT,
  applyCalibration,
  assessCalibrationDrift,
  buildCalibrationProfile,
  clearCalibrationProfile,
  listCalibrationSlots,
  loadCalibrationProfile,
  saveCalibrationProfile,
  type CalibrationCapture,
  type CalibrationProfile
} from "../calibration/AdaptiveCalibration";
import { RemoteCommandEngine } from "../control/RemoteCommandEngine";
import type { RemoteAction, RemoteTarget } from "../control/commands";
import type { GazeProvider, GazeSample, Point, ProviderState, Unsubscribe } from "../core/types";
import { MockGazeProvider } from "../providers/MockGazeProvider";
import { PointerGazeProvider } from "../providers/PointerGazeProvider";
import { TobiiWebSocketProvider } from "../providers/TobiiWebSocketProvider";

type CalibrationSession = {
  active: boolean;
  step: number;
  captures: CalibrationCapture[];
};

type ConnectReason = "manual" | "fallback";

type HealthState = "idle" | "warming" | "good" | "stale" | "error";

const fmt = (value: number) => value.toFixed(3);

const PROVIDER_FALLBACK_CHAIN: Record<string, string[]> = {
  tobii_ws: ["pointer", "mock"],
  pointer: ["mock"],
  mock: []
};

export class AppController {
  private root: HTMLElement;
  private providers: Record<string, GazeProvider>;
  private tobiiProvider: TobiiWebSocketProvider;
  private activeProvider: GazeProvider | null = null;
  private unsubscribers: Unsubscribe[] = [];

  private calibrationSlot = DEFAULT_CALIBRATION_SLOT;
  private calibrationProfile: CalibrationProfile = loadCalibrationProfile(this.calibrationSlot);
  private calibrationSession: CalibrationSession = {
    active: false,
    step: 0,
    captures: []
  };

  private lastRawSample: GazeSample | null = null;
  private commandEngine: RemoteCommandEngine;

  // Phase 2 stability controls
  private autoFallbackEnabled = true;
  private fallbackAttempts = 0;
  private fallbackInProgress = false;
  private lastFallbackAt = 0;
  private readonly fallbackCooldownMs = 3000;
  private connecting = false;
  private providerConnectedAt = 0;
  private lastSampleAt = 0;
  private healthTimerId: number | null = null;
  private readonly initialSampleTimeoutMs = 5200;
  private readonly staleSampleTimeoutMs = 3200;

  // Phase 3 quality and drift tracking
  private sampleTimestamps: number[] = [];
  private confidenceWindow: number[] = [];
  private driftCaptures: CalibrationCapture[] = [];

  private providerSelect!: HTMLSelectElement;
  private tobiiUrlInput!: HTMLInputElement;
  private connectButton!: HTMLButtonElement;
  private calibrateButton!: HTMLButtonElement;
  private captureButton!: HTMLButtonElement;
  private resetButton!: HTMLButtonElement;
  private blink1Button!: HTMLButtonElement;
  private blink2Button!: HTMLButtonElement;
  private blink3Button!: HTMLButtonElement;
  private dwellInput!: HTMLInputElement;
  private autoFallbackCheckbox!: HTMLInputElement;
  private slotInput!: HTMLInputElement;
  private slotApplyButton!: HTMLButtonElement;
  private stage!: HTMLDivElement;
  private cursor!: HTMLDivElement;
  private calibrationDot!: HTMLDivElement;
  private statusEl!: HTMLDivElement;
  private providerStateEl!: HTMLDivElement;
  private rawEl!: HTMLDivElement;
  private calibratedEl!: HTMLDivElement;
  private qualityEl!: HTMLDivElement;
  private calibrationEl!: HTMLDivElement;
  private slotEl!: HTMLDivElement;
  private sampleRateEl!: HTMLDivElement;
  private confidenceEl!: HTMLDivElement;
  private driftEl!: HTMLDivElement;
  private driftRecEl!: HTMLDivElement;
  private healthEl!: HTMLDivElement;
  private fallbackEl!: HTMLDivElement;
  private logsEl!: HTMLUListElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.tobiiProvider = new TobiiWebSocketProvider();
    this.providers = {
      mock: new MockGazeProvider(),
      pointer: new PointerGazeProvider(),
      tobii_ws: this.tobiiProvider
    };
    this.commandEngine = new RemoteCommandEngine({
      dwellMs: 850,
      dwellCooldownMs: 650,
      blinkCooldownMs: 260,
      globalCooldownMs: 160,
      onAction: (action, meta) => this.handleRemoteAction(action, meta.reason, meta.targetId)
    });

    this.render();
    this.bind();
    this.applyCalibrationSlot(DEFAULT_CALIBRATION_SLOT, false);
    this.updateFallbackLabel();
    this.setHealth("idle", "not connected");
    this.updateQualityDashboard();
    this.log("v2 initialized with phase-3 quality dashboard", "info");
  }

  private render(): void {
    this.root.innerHTML = `
      <div class="shell">
        <div class="toolbar">
          <label>Provider
            <select id="providerSelect">
              <option value="mock">Mock</option>
              <option value="pointer">Pointer</option>
              <option value="tobii_ws">Tobii WS</option>
            </select>
          </label>
          <label>WS URL
            <input id="tobiiUrl" value="ws://127.0.0.1:8765" size="23" />
          </label>
          <label>Profile slot
            <input id="slotInput" value="global" size="20" />
          </label>
          <button id="slotApplyButton">Load Slot</button>
          <button id="connectButton">Connect</button>
          <button id="calibrateButton">Start Calibration</button>
          <button id="captureButton" disabled>Capture Point</button>
          <button id="resetButton">Reset Calibration</button>
          <label>Dwell (ms)
            <input id="dwellInput" type="number" min="150" max="4000" step="50" value="850" />
          </label>
          <label>
            <input id="autoFallbackCheckbox" type="checkbox" checked />
            Auto fallback
          </label>
          <button id="blink1Button">Blink x1</button>
          <button id="blink2Button">Blink x2</button>
          <button id="blink3Button">Blink x3</button>
        </div>
        <div class="layout">
          <div class="stage" id="stage">
            <div class="stage-header">Remote control stage</div>
            <div class="target-grid">
              <button class="remote-target" data-action="previous" id="targetPrevious">Previous</button>
              <button class="remote-target" data-action="select" id="targetSelect">Select</button>
              <button class="remote-target" data-action="next" id="targetNext">Next</button>
              <button class="remote-target" data-action="toggleMute" id="targetMute">Mute</button>
              <button class="remote-target" data-action="openSettings" id="targetSettings">Settings</button>
              <button class="remote-target" data-action="select" id="targetConfirm">Confirm</button>
            </div>
            <div id="cursor" class="cursor"></div>
            <div id="calibrationDot" class="calibration-dot"></div>
          </div>
          <div class="side">
            <div id="providerState" class="stats"></div>
            <div class="stats">
              <div id="statusEl"><span>Status:</span> idle</div>
              <div id="healthEl"><span>Feed health:</span> -</div>
              <div id="fallbackEl"><span>Fallback:</span> -</div>
              <div id="slotEl"><span>Profile slot:</span> -</div>
              <div id="sampleRateEl"><span>Sample rate:</span> -</div>
              <div id="confidenceEl"><span>Avg confidence:</span> -</div>
              <div id="driftEl"><span>Drift:</span> -</div>
              <div id="driftRecEl"><span>Drift action:</span> -</div>
              <div id="rawEl"><span>Raw:</span> -</div>
              <div id="calibratedEl"><span>Calibrated:</span> -</div>
              <div id="qualityEl"><span>Profile quality:</span> -</div>
              <div id="calibrationEl"><span>Calibration:</span> -</div>
            </div>
            <div class="logs"><ul id="logsEl"></ul></div>
          </div>
        </div>
      </div>
    `;

    this.providerSelect = this.root.querySelector("#providerSelect") as HTMLSelectElement;
    this.tobiiUrlInput = this.root.querySelector("#tobiiUrl") as HTMLInputElement;
    this.slotInput = this.root.querySelector("#slotInput") as HTMLInputElement;
    this.slotApplyButton = this.root.querySelector("#slotApplyButton") as HTMLButtonElement;
    this.connectButton = this.root.querySelector("#connectButton") as HTMLButtonElement;
    this.calibrateButton = this.root.querySelector("#calibrateButton") as HTMLButtonElement;
    this.captureButton = this.root.querySelector("#captureButton") as HTMLButtonElement;
    this.resetButton = this.root.querySelector("#resetButton") as HTMLButtonElement;
    this.blink1Button = this.root.querySelector("#blink1Button") as HTMLButtonElement;
    this.blink2Button = this.root.querySelector("#blink2Button") as HTMLButtonElement;
    this.blink3Button = this.root.querySelector("#blink3Button") as HTMLButtonElement;
    this.dwellInput = this.root.querySelector("#dwellInput") as HTMLInputElement;
    this.autoFallbackCheckbox = this.root.querySelector("#autoFallbackCheckbox") as HTMLInputElement;
    this.stage = this.root.querySelector("#stage") as HTMLDivElement;
    this.cursor = this.root.querySelector("#cursor") as HTMLDivElement;
    this.calibrationDot = this.root.querySelector("#calibrationDot") as HTMLDivElement;
    this.statusEl = this.root.querySelector("#statusEl") as HTMLDivElement;
    this.providerStateEl = this.root.querySelector("#providerState") as HTMLDivElement;
    this.rawEl = this.root.querySelector("#rawEl") as HTMLDivElement;
    this.calibratedEl = this.root.querySelector("#calibratedEl") as HTMLDivElement;
    this.qualityEl = this.root.querySelector("#qualityEl") as HTMLDivElement;
    this.calibrationEl = this.root.querySelector("#calibrationEl") as HTMLDivElement;
    this.slotEl = this.root.querySelector("#slotEl") as HTMLDivElement;
    this.sampleRateEl = this.root.querySelector("#sampleRateEl") as HTMLDivElement;
    this.confidenceEl = this.root.querySelector("#confidenceEl") as HTMLDivElement;
    this.driftEl = this.root.querySelector("#driftEl") as HTMLDivElement;
    this.driftRecEl = this.root.querySelector("#driftRecEl") as HTMLDivElement;
    this.healthEl = this.root.querySelector("#healthEl") as HTMLDivElement;
    this.fallbackEl = this.root.querySelector("#fallbackEl") as HTMLDivElement;
    this.logsEl = this.root.querySelector("#logsEl") as HTMLUListElement;
  }

  private bind(): void {
    this.connectButton.addEventListener("click", () => {
      if (this.activeProvider) {
        void this.disconnectProvider("manual");
      } else {
        void this.connectSelectedProvider();
      }
    });

    this.slotApplyButton.addEventListener("click", () => {
      this.applyCalibrationSlot(this.slotInput.value, true);
    });

    this.calibrateButton.addEventListener("click", () => this.startCalibration());
    this.captureButton.addEventListener("click", () => this.captureCalibrationPoint());
    this.resetButton.addEventListener("click", () => this.resetCalibration());

    this.blink1Button.addEventListener("click", () => this.commandEngine.registerBlink(1, this.getCurrentHoverTargetId()));
    this.blink2Button.addEventListener("click", () => this.commandEngine.registerBlink(2, this.getCurrentHoverTargetId()));
    this.blink3Button.addEventListener("click", () => this.commandEngine.registerBlink(3, this.getCurrentHoverTargetId()));

    this.dwellInput.addEventListener("change", () => {
      const next = Number(this.dwellInput.value);
      if (!Number.isFinite(next)) return;
      this.commandEngine.setDwellMs(next);
      this.log(`Dwell set to ${Math.round(next)}ms`, "info");
    });

    this.autoFallbackCheckbox.addEventListener("change", () => {
      this.autoFallbackEnabled = this.autoFallbackCheckbox.checked;
      this.updateFallbackLabel();
      this.log(`Auto fallback ${this.autoFallbackEnabled ? "enabled" : "disabled"}`, "info");
    });

    window.addEventListener("resize", () => {
      if (this.lastRawSample) this.renderSample(this.lastRawSample);
      this.renderCalibrationTarget();
    });
  }

  private async connectSelectedProvider(): Promise<void> {
    const selectedProvider = this.providerSelect.value;
    const ok = await this.connectProvider(selectedProvider, "manual");
    if (!ok) {
      await this.tryFallback(selectedProvider, "manual connect failed");
    }
  }

  private async connectProvider(providerId: string, reason: ConnectReason): Promise<boolean> {
    const provider = this.providers[providerId];
    if (!provider) {
      this.log(`Unknown provider: ${providerId}`, "error");
      return false;
    }
    if (this.connecting) return false;
    if (this.activeProvider?.id === providerId) return true;

    this.connecting = true;
    try {
      if (this.activeProvider) await this.disconnectProvider("switch", true);

      this.clearSubscriptions();
      this.activeProvider = provider;
      this.providerSelect.value = providerId;
      this.connectButton.textContent = "Disconnect";
      this.statusEl.innerHTML = "<span>Status:</span> connecting...";
      this.providerConnectedAt = Date.now();
      this.lastSampleAt = 0;

      const providerSlot = this.deriveCalibrationSlot(providerId);
      this.applyCalibrationSlot(providerSlot, false);

      if (provider.id === "tobii_ws") this.tobiiProvider.setUrl(this.tobiiUrlInput.value);

      this.unsubscribers.push(
        provider.onSample((sample) => this.handleSample(sample)),
        provider.onState((state) => this.handleProviderState(state))
      );

      await provider.connect();
      this.startHealthWatchdog();
      this.setHealth("warming", "waiting for first sample");
      this.log(
        `Connected: ${provider.label}${reason === "fallback" ? " (fallback)" : ""}`,
        reason === "fallback" ? "warn" : "info"
      );
      if (provider.requiresUserCalibration && this.calibrationProfile.captureCount < 3) {
        this.log("Calibration recommended for this provider", "warn");
      }
      return true;
    } catch (error) {
      const message = (error as Error).message;
      this.log(`Connection failed for ${provider.label}: ${message}`, "error");
      this.setHealth("error", "connection failed");
      await this.disconnectProvider("teardown", true);
      return false;
    } finally {
      this.connecting = false;
    }
  }

  private deriveCalibrationSlot(providerId: string): string {
    if (providerId === "tobii_ws") {
      const normalized = this.tobiiUrlInput.value
        .trim()
        .replace(/^wss?:\/\//i, "")
        .replace(/[^a-zA-Z0-9_.:-]/g, "_") || "local";
      return `tobii_ws:${normalized}`;
    }
    return `${providerId}:default`;
  }

  private applyCalibrationSlot(slot: string, announce: boolean): void {
    const normalized = slot.trim() || DEFAULT_CALIBRATION_SLOT;
    this.calibrationSlot = normalized;
    this.slotInput.value = normalized;
    this.calibrationProfile = loadCalibrationProfile(normalized);
    this.updateCalibrationStats();
    this.updateQualityDashboard();

    if (announce) {
      this.log(
        `Loaded slot ${normalized} (quality ${fmt(this.calibrationProfile.quality)}, captures ${this.calibrationProfile.captureCount})`,
        "info"
      );
    }
  }

  private async disconnectProvider(
    reason: "manual" | "switch" | "teardown",
    silent = false
  ): Promise<void> {
    if (!this.activeProvider) return;
    const current = this.activeProvider;

    this.stopHealthWatchdog();
    this.activeProvider = null;
    this.lastSampleAt = 0;
    this.providerConnectedAt = 0;
    this.connectButton.textContent = "Connect";
    this.statusEl.innerHTML = "<span>Status:</span> idle";
    this.providerStateEl.textContent = "";
    this.setHealth("idle", "disconnected");
    this.clearSubscriptions();

    try {
      await current.disconnect();
    } catch (error) {
      this.log(`Error while disconnecting ${current.label}: ${(error as Error).message}`, "error");
    }

    if (!silent && reason === "manual") {
      this.log(`Disconnected: ${current.label}`, "info");
    }
  }

  private clearSubscriptions(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
  }

  private handleProviderState(state: ProviderState): void {
    this.providerStateEl.innerHTML = `<span>Provider:</span> ${state.status}${state.message ? ` · ${state.message}` : ""}`;
    if (!this.activeProvider) return;

    if (state.status === "error") {
      this.setHealth("error", state.message ?? "provider error");
      void this.tryFallback(this.activeProvider.id, "provider error state");
    }
  }

  private handleSample(sample: GazeSample): void {
    this.lastRawSample = sample;
    this.lastSampleAt = Date.now();

    this.sampleTimestamps.push(this.lastSampleAt);
    this.sampleTimestamps = this.sampleTimestamps.filter((t) => this.lastSampleAt - t <= 5000);

    this.confidenceWindow.push(sample.confidence);
    if (this.confidenceWindow.length > 120) this.confidenceWindow.shift();

    this.renderSample(sample);
    this.updateQualityDashboard();
  }

  private startHealthWatchdog(): void {
    this.stopHealthWatchdog();
    this.healthTimerId = window.setInterval(() => {
      if (!this.activeProvider) return;
      const now = Date.now();

      if (this.lastSampleAt === 0) {
        const waitMs = now - this.providerConnectedAt;
        if (waitMs < this.initialSampleTimeoutMs) {
          this.setHealth("warming", `waiting ${Math.round(waitMs / 100) / 10}s for first sample`);
          return;
        }
        this.setHealth("stale", `no samples after ${Math.round(waitMs / 1000)}s`);
        void this.tryFallback(this.activeProvider.id, "no first sample");
        return;
      }

      const sampleAgeMs = now - this.lastSampleAt;
      if (sampleAgeMs <= this.staleSampleTimeoutMs) {
        this.setHealth("good", `${sampleAgeMs}ms sample age`);
        return;
      }
      this.setHealth("stale", `sample age ${Math.round(sampleAgeMs)}ms`);
      void this.tryFallback(this.activeProvider.id, `stale feed ${Math.round(sampleAgeMs)}ms`);
    }, 1000);
  }

  private stopHealthWatchdog(): void {
    if (this.healthTimerId != null) {
      clearInterval(this.healthTimerId);
      this.healthTimerId = null;
    }
  }

  private setHealth(state: HealthState, message: string): void {
    this.healthEl.innerHTML = `<span>Feed health:</span> ${state} · ${message}`;
  }

  private async tryFallback(fromProviderId: string, reason: string): Promise<void> {
    if (!this.autoFallbackEnabled || this.fallbackInProgress) return;
    const now = Date.now();
    if (now - this.lastFallbackAt < this.fallbackCooldownMs) return;

    this.fallbackInProgress = true;
    try {
      let currentId = fromProviderId;
      while (true) {
        const nextProviderId = this.getFallbackProviderId(currentId);
        if (!nextProviderId) {
          this.log(`No fallback provider available from ${currentId} (${reason})`, "error");
          return;
        }

        this.fallbackAttempts += 1;
        this.updateFallbackLabel(`${currentId} -> ${nextProviderId} · ${reason}`);
        this.log(
          `Fallback #${this.fallbackAttempts}: ${currentId} -> ${nextProviderId} (${reason})`,
          "warn"
        );

        const ok = await this.connectProvider(nextProviderId, "fallback");
        if (ok) return;
        currentId = nextProviderId;
      }
    } finally {
      this.lastFallbackAt = Date.now();
      this.fallbackInProgress = false;
      this.updateFallbackLabel();
    }
  }

  private getFallbackProviderId(fromProviderId: string): string | null {
    const chain = PROVIDER_FALLBACK_CHAIN[fromProviderId] ?? [];
    for (const candidate of chain) {
      if (this.providers[candidate]) return candidate;
    }
    return null;
  }

  private updateFallbackLabel(detail?: string): void {
    this.fallbackEl.innerHTML = `<span>Fallback:</span> ${
      this.autoFallbackEnabled ? "enabled" : "disabled"
    } · attempts ${this.fallbackAttempts}${detail ? ` · ${detail}` : ""}`;
  }

  private updateQualityDashboard(): void {
    const now = Date.now();
    this.sampleTimestamps = this.sampleTimestamps.filter((t) => now - t <= 5000);
    const sampleRate = this.sampleTimestamps.length / 5;
    const avgConfidence = this.confidenceWindow.length
      ? this.confidenceWindow.reduce((a, b) => a + b, 0) / this.confidenceWindow.length
      : 0;

    const drift = assessCalibrationDrift(this.driftCaptures, this.calibrationProfile);

    this.sampleRateEl.innerHTML = `<span>Sample rate:</span> ${fmt(sampleRate)} Hz`;
    this.confidenceEl.innerHTML = `<span>Avg confidence:</span> ${fmt(avgConfidence)}`;
    this.driftEl.innerHTML = `<span>Drift:</span> ${drift.level} (${fmt(drift.error)})`;
    this.driftRecEl.innerHTML = `<span>Drift action:</span> ${drift.recommendedAction}`;
  }

  private recordDriftCapture(targetId?: string): void {
    if (!targetId || !this.lastRawSample) return;
    const target = this.getStageTargets().find((t) => t.id === targetId);
    if (!target) return;

    const width = Math.max(this.stage.clientWidth, 1);
    const height = Math.max(this.stage.clientHeight, 1);
    const targetCenter: Point = {
      x: (target.rect.left + target.rect.width / 2) / width,
      y: (target.rect.top + target.rect.height / 2) / height
    };

    this.driftCaptures.push({ raw: this.lastRawSample.raw, target: targetCenter });
    if (this.driftCaptures.length > 48) this.driftCaptures.shift();
    this.updateQualityDashboard();
  }

  private renderSample(sample: GazeSample): void {
    const calibrated = applyCalibration(sample.raw, this.calibrationProfile);
    this.rawEl.innerHTML = `<span>Raw:</span> (${fmt(sample.raw.x)}, ${fmt(sample.raw.y)}) c=${fmt(sample.confidence)}`;
    this.calibratedEl.innerHTML = `<span>Calibrated:</span> (${fmt(calibrated.x)}, ${fmt(calibrated.y)})`;
    this.statusEl.innerHTML = "<span>Status:</span> tracking";

    const px = this.normalizedToStage(calibrated);
    this.cursor.style.left = `${px.x}px`;
    this.cursor.style.top = `${px.y}px`;
    this.updateTargetActiveState(px);
    this.commandEngine.updateGaze(px, this.getStageTargets(), sample.timestamp);

    if (sample.blinkCount && sample.blinkCount > 0) {
      this.commandEngine.registerBlink(sample.blinkCount, this.getCurrentHoverTargetId(), sample.timestamp);
    }
  }

  private normalizedToStage(point: Point): Point {
    return {
      x: point.x * this.stage.clientWidth,
      y: point.y * this.stage.clientHeight
    };
  }

  private getStageTargets(): RemoteTarget[] {
    const stageRect = this.stage.getBoundingClientRect();
    const buttons = Array.from(this.stage.querySelectorAll<HTMLButtonElement>(".remote-target"));
    return buttons.map((button) => {
      const r = button.getBoundingClientRect();
      const action = (button.dataset.action as RemoteAction | undefined) ?? "select";
      return {
        id: button.id,
        action,
        rect: new DOMRect(r.left - stageRect.left, r.top - stageRect.top, r.width, r.height)
      };
    });
  }

  private updateTargetActiveState(point: Point): void {
    for (const target of this.getStageTargets()) {
      const active =
        point.x >= target.rect.left &&
        point.x <= target.rect.right &&
        point.y >= target.rect.top &&
        point.y <= target.rect.bottom;
      const element = this.stage.querySelector(`#${target.id}`);
      if (element) element.setAttribute("data-active", String(active));
    }
  }

  private getCurrentHoverTargetId(): string | undefined {
    const active = this.stage.querySelector(".remote-target[data-active='true']") as HTMLButtonElement | null;
    return active?.id;
  }

  private startCalibration(): void {
    this.calibrationSession = { active: true, step: 0, captures: [] };
    this.captureButton.disabled = false;
    this.calibrateButton.disabled = true;
    this.log("Calibration started: look at the yellow dot, then click Capture Point", "info");
    this.renderCalibrationTarget();
  }

  private renderCalibrationTarget(): void {
    if (!this.calibrationSession.active) {
      this.calibrationDot.classList.remove("visible");
      return;
    }
    const target = CALIBRATION_TARGETS[this.calibrationSession.step];
    this.calibrationDot.classList.add("visible");
    this.calibrationDot.style.left = `${target.x * this.stage.clientWidth}px`;
    this.calibrationDot.style.top = `${target.y * this.stage.clientHeight}px`;
  }

  private captureCalibrationPoint(): void {
    if (!this.calibrationSession.active) return;
    if (!this.lastRawSample) {
      this.log("No gaze sample yet; connect a provider first", "warn");
      return;
    }

    const target = CALIBRATION_TARGETS[this.calibrationSession.step];
    this.calibrationSession.captures.push({ raw: this.lastRawSample.raw, target });
    this.log(
      `Captured ${this.calibrationSession.step + 1}/${CALIBRATION_TARGETS.length} at (${fmt(target.x)}, ${fmt(target.y)})`,
      "info"
    );
    this.calibrationSession.step += 1;

    if (this.calibrationSession.step >= CALIBRATION_TARGETS.length) {
      this.finishCalibration();
      return;
    }
    this.renderCalibrationTarget();
  }

  private finishCalibration(): void {
    const captures = this.calibrationSession.captures;
    this.calibrationProfile = buildCalibrationProfile(captures, this.calibrationProfile);
    saveCalibrationProfile(this.calibrationProfile, this.calibrationSlot);

    this.driftCaptures = [];
    this.log(
      `Calibration completed for slot ${this.calibrationSlot}. quality=${fmt(this.calibrationProfile.quality)} captures=${captures.length}`,
      "info"
    );
    this.calibrationSession = { active: false, step: 0, captures: [] };
    this.captureButton.disabled = true;
    this.calibrateButton.disabled = false;
    this.calibrationDot.classList.remove("visible");
    this.updateCalibrationStats();
    this.updateQualityDashboard();
  }

  private updateCalibrationStats(): void {
    const p = this.calibrationProfile;
    this.qualityEl.innerHTML = `<span>Profile quality:</span> ${fmt(p.quality)}`;
    const stamp = p.calibratedAt ? new Date(p.calibratedAt).toLocaleString() : "never";
    this.calibrationEl.innerHTML = `<span>Calibration:</span> ${p.captureCount} points · ${stamp}`;

    const slots = listCalibrationSlots();
    this.slotEl.innerHTML = `<span>Profile slot:</span> ${this.calibrationSlot} (${slots.length} stored)`;
  }

  private resetCalibration(): void {
    this.calibrationProfile = clearCalibrationProfile(this.calibrationSlot);
    this.calibrationSession = { active: false, step: 0, captures: [] };
    this.driftCaptures = [];
    this.captureButton.disabled = true;
    this.calibrateButton.disabled = false;
    this.calibrationDot.classList.remove("visible");
    this.updateCalibrationStats();
    this.updateQualityDashboard();
    this.log(`Calibration profile reset for slot ${this.calibrationSlot}`, "warn");
  }

  private handleRemoteAction(action: RemoteAction, reason: "dwell" | "blink", targetId?: string): void {
    if (targetId) {
      const el = this.stage.querySelector(`#${targetId}`) as HTMLElement | null;
      if (el) {
        el.classList.remove("flash");
        // reflow for replay
        void el.offsetHeight;
        el.classList.add("flash");
      }
    }

    if (reason === "dwell") {
      this.recordDriftCapture(targetId);
    }

    this.log(`Action: ${action} (${reason}${targetId ? ` on ${targetId}` : ""})`, "info");
  }

  private log(message: string, level: "info" | "warn" | "error"): void {
    const item = document.createElement("li");
    item.textContent = `${new Date().toLocaleTimeString()} · ${message}`;
    if (level === "warn") item.className = "log-warn";
    if (level === "error") item.className = "log-error";
    this.logsEl.prepend(item);
    while (this.logsEl.children.length > 80) {
      this.logsEl.removeChild(this.logsEl.lastChild as Node);
    }
  }
}
