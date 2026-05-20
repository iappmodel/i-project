import type {
  PopsBatteryState,
  PopsClientConfig,
  PopsDeviceContext,
  PopsIntegrityStatus,
  PopsNetworkType,
} from "./pops-client.types";

function detectNetworkType(): PopsNetworkType {
  const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { connection?: { type?: string } }) : null;
  const raw = nav?.connection?.type?.toLowerCase() ?? "unknown";
  if (raw.includes("wifi")) return "wifi";
  if (raw.includes("cell")) return "cellular";
  if (raw.includes("ethernet")) return "ethernet";
  if (raw.includes("none")) return "none";
  return "unknown";
}

function detectOs(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "ios";
  if (ua.includes("mac os")) return "macos";
  if (ua.includes("win")) return "windows";
  if (ua.includes("linux")) return "linux";
  return "unknown";
}

function detectDeviceModelClass(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("ipad") || ua.includes("tablet")) return "tablet";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) return "phone";
  return "desktop";
}

export type PopsDeviceContextCollectorInput = {
  appForegrounded: boolean;
  screenActive: boolean;
  batteryLevelPct?: number;
  batteryState?: PopsBatteryState;
  lowPowerMode?: boolean;
  integrityStatus?: PopsIntegrityStatus;
};

export class PopsDeviceContextCollector {
  constructor(private readonly config: PopsClientConfig) {}

  collect(input: PopsDeviceContextCollectorInput): PopsDeviceContext {
    const networkType = detectNetworkType();
    const lowBatteryThreshold = this.config.lowBatteryThresholdPct ?? 20;
    const lowBatteryMode = typeof input.batteryLevelPct === "number" && input.batteryLevelPct <= lowBatteryThreshold;
    const poorNetworkMode = (this.config.poorNetworkTypes ?? ["none", "cellular"]).includes(networkType);
    return {
      appVersion: this.config.appVersion,
      os: detectOs(),
      deviceModelClass: detectDeviceModelClass(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
      networkType,
      batteryState: input.batteryState ?? "unknown",
      batteryLevelPct: input.batteryLevelPct,
      lowPowerMode: input.lowPowerMode,
      screenActive: input.screenActive,
      appForegrounded: input.appForegrounded,
      integrityStatus: input.integrityStatus ?? "unknown",
      lowBatteryMode,
      poorNetworkMode,
    };
  }
}
