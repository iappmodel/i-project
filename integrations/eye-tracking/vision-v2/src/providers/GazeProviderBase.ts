import { Emitter } from "../core/emitter";
import type { GazeProvider, GazeSample, ProviderState, Unsubscribe } from "../core/types";

export abstract class GazeProviderBase implements GazeProvider {
  abstract id: string;
  abstract label: string;
  abstract requiresUserCalibration: boolean;
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  private sampleEmitter = new Emitter<GazeSample>();
  private stateEmitter = new Emitter<ProviderState>();

  onSample(listener: (sample: GazeSample) => void): Unsubscribe {
    return this.sampleEmitter.on(listener);
  }

  onState(listener: (state: ProviderState) => void): Unsubscribe {
    return this.stateEmitter.on(listener);
  }

  protected emitSample(sample: GazeSample): void {
    this.sampleEmitter.emit(sample);
  }

  protected emitState(state: ProviderState): void {
    this.stateEmitter.emit(state);
  }
}

