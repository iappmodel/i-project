import { useCallback, useRef } from "react";
import { PopsIntentService, createIntentSignal, type CreateIntentSignalInput } from "./pops-intent.service";
import type { PopsIntentAssessment, PopsIntentEvaluationContext } from "./pops-intent.types";

export type PopsIntentCaptureApi = {
  recordEvent: (eventType: "INTENT_CAPTURED", payload?: Record<string, unknown>) => void;
};

export type UsePopsIntentCaptureInput = PopsIntentCaptureApi & {
  context: PopsIntentEvaluationContext;
  onAssessment?: (assessment: PopsIntentAssessment) => void;
};

export function usePopsIntentCapture(input: UsePopsIntentCaptureInput) {
  const serviceRef = useRef(new PopsIntentService());

  const captureIntent = useCallback(
    (signalInput: CreateIntentSignalInput): PopsIntentAssessment => {
      const signal = createIntentSignal(signalInput);
      const assessment = serviceRef.current.evaluate(signal, input.context);
      input.recordEvent("INTENT_CAPTURED", {
        actionType: assessment.signal.actionType,
        intentConfidence: assessment.intentConfidence,
        isDeliberate: assessment.isDeliberate,
        reasonCodes: assessment.reasonCodes
      });
      input.onAssessment?.(assessment);
      return assessment;
    },
    [input]
  );

  return { captureIntent };
}
