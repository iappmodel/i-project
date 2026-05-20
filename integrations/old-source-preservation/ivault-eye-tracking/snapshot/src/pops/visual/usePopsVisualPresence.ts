import { useMemo, useRef, useState } from "react";
import {
  computeVisualPresenceScore,
  PopsVisualPresenceService,
  toPopsVisualSignalFields,
} from "./pops-visual-presence.service";
import {
  POPS_VISUAL_ACTIVE_STATUS_COPY,
  POPS_VISUAL_PERMISSION_COPY,
} from "./pops-visual-privacy";
import {
  type PopsVisualPresenceComputation,
  type PopsVisualPresenceState,
  type PopsVisualScoringContext,
  type PopsVisualSignal,
  type PopsVisualSignalInput,
} from "./pops-visual-presence.types";

type UsePopsVisualPresenceInput = {
  available?: boolean;
  campaignRequiresVisualProof?: boolean;
  highValueRewardFlow?: boolean;
  proofLevel?: "BASIC" | "ATTENTION" | "STRONG";
};

type VisualSignalSummary = {
  visualPresenceScore: number;
  visualQuality: number;
  visualSpoofRisk: number;
  visualContinuityScore: number;
};

type UsePopsVisualPresenceResult = {
  state: PopsVisualPresenceState;
  enabled: boolean;
  unavailable: boolean;
  permissionCopy: typeof POPS_VISUAL_PERMISSION_COPY;
  activeStatusCopy: typeof POPS_VISUAL_ACTIVE_STATUS_COPY;
  latestSignal: PopsVisualSignal;
  latestComputation: PopsVisualPresenceComputation;
  signals: VisualSignalSummary;
  signalBatchFields: {
    "signals.visualPresenceScore": number;
    "signals.visualQuality": number;
    "signals.visualSpoofRisk": number;
    "signals.visualContinuityScore": number;
  };
  requestPermission: () => void;
  enable: () => void;
  disable: () => void;
  ingestSignal: (input: PopsVisualSignalInput, context?: { progressAdvancing?: boolean }) => PopsVisualPresenceComputation;
  reset: () => void;
};

const INITIAL_COMPUTATION: PopsVisualPresenceComputation = {
  state: "NOT_REQUESTED",
  visualPresenceScore: 0,
  visualQuality: 0,
  visualSpoofRisk: 0,
  visualContinuityScore: 0,
  breakdown: {
    facePresentWeight: 0,
    visualQualityWeight: 0,
    headPoseStabilityWeight: 0,
    blinkNaturalnessWeight: 0,
    gazeEstimateWeight: 0,
    spoofRiskPenalty: 0,
    occlusionPenalty: 0,
    multipleFacesPenalty: 0,
  },
  holdSuggested: false,
  denySuggested: false,
  reasons: [],
};

export function usePopsVisualPresence(input?: UsePopsVisualPresenceInput): UsePopsVisualPresenceResult {
  const available = input?.available ?? true;
  const serviceRef = useRef(new PopsVisualPresenceService());

  const [state, setState] = useState<PopsVisualPresenceState>(available ? "NOT_REQUESTED" : "UNAVAILABLE");
  const [enabled, setEnabled] = useState(false);
  const [latestComputation, setLatestComputation] =
    useState<PopsVisualPresenceComputation>(INITIAL_COMPUTATION);

  const latestSignal = serviceRef.current.getLastSignal();

  const scoringContext = (progressAdvancing?: boolean): PopsVisualScoringContext => ({
    campaignRequiresVisualProof: input?.campaignRequiresVisualProof ?? false,
    highValueRewardFlow: input?.highValueRewardFlow ?? false,
    proofLevel: input?.proofLevel ?? "BASIC",
    progressAdvancing,
  });

  const requestPermission = () => {
    if (!available) {
      setState("UNAVAILABLE");
      return;
    }
    setState("PERMISSION_REQUIRED");
  };

  const enable = () => {
    if (!available) {
      setState("UNAVAILABLE");
      return;
    }
    setEnabled(true);
    setState("INITIALIZING");
  };

  const disable = () => {
    setEnabled(false);
    setState("DISABLED_BY_USER");
  };

  const ingestSignal = (
    signalInput: PopsVisualSignalInput,
    context?: { progressAdvancing?: boolean },
  ): PopsVisualPresenceComputation => {
    if (!available) {
      const unavailable: PopsVisualPresenceComputation = {
        ...latestComputation,
        state: "UNAVAILABLE",
      };
      setLatestComputation(unavailable);
      setState("UNAVAILABLE");
      return unavailable;
    }

    if (!enabled) {
      requestPermission();
      return latestComputation;
    }

    const safeInput: PopsVisualSignalInput = {
      ...signalInput,
      rawFrameStored: signalInput.rawFrameStored ?? false,
      localProcessingUsed: signalInput.localProcessingUsed ?? true,
    };

    const computed = serviceRef.current.compute(safeInput, scoringContext(context?.progressAdvancing));
    setLatestComputation(computed);

    if (computed.state === "FACE_PRESENT") {
      setState("ACTIVE");
    } else {
      setState(computed.state);
    }

    return computed;
  };

  const reset = () => {
    serviceRef.current.reset();
    setLatestComputation(INITIAL_COMPUTATION);
    setState(available ? "NOT_REQUESTED" : "UNAVAILABLE");
    setEnabled(false);
  };

  const signals = useMemo<VisualSignalSummary>(() => {
    const computed = latestComputation.state === "NOT_REQUESTED" ? INITIAL_COMPUTATION : latestComputation;
    return {
      visualPresenceScore: computed.visualPresenceScore,
      visualQuality: computed.visualQuality,
      visualSpoofRisk: computed.visualSpoofRisk,
      visualContinuityScore: computed.visualContinuityScore,
    };
  }, [latestComputation]);

  const signalBatchFields = useMemo(() => toPopsVisualSignalFields(latestComputation), [latestComputation]);

  return {
    state,
    enabled,
    unavailable: !available,
    permissionCopy: POPS_VISUAL_PERMISSION_COPY,
    activeStatusCopy: POPS_VISUAL_ACTIVE_STATUS_COPY,
    latestSignal,
    latestComputation,
    signals,
    signalBatchFields,
    requestPermission,
    enable,
    disable,
    ingestSignal,
    reset,
  };
}

export { computeVisualPresenceScore };

