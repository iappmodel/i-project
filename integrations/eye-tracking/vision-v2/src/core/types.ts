export type Point = {
  x: number;
  y: number;
};

export type ProviderStatus = "idle" | "connecting" | "ready" | "error" | "stopped";

export type ProviderState = {
  status: ProviderStatus;
  message?: string;
};

export type GazeSample = {
  timestamp: number;
  raw: Point;
  confidence: number;
  source: string;
  eyesOpen?: boolean;
  blinkCount?: number;
};

export type Unsubscribe = () => void;

export interface GazeProvider {
  id: string;
  label: string;
  requiresUserCalibration: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onSample(listener: (sample: GazeSample) => void): Unsubscribe;
  onState(listener: (state: ProviderState) => void): Unsubscribe;
}

