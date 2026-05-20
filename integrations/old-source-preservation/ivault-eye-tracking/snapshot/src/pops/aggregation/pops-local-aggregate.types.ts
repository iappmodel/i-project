import type { PopsEvent } from "../types/pops-events.types";
import type { PopsSession } from "../types/pops.types";

/** Input for building the local sponsored-watch aggregate (normalized inside the builder). */
export interface BuildLocalSponsoredWatchAggregateInput {
  session: PopsSession;
  events: PopsEvent[];
  /** Wall clock used when `session.endedAt` is absent; typically session end instant. */
  referenceNowMs: number;
}
