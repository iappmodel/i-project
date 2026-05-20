import { useCallback, useEffect, useRef } from "react";
import type { PopsSignalItem } from "../capture/pops-client-events";

type ProgressApi = {
  recordEvent: (eventType: "CONTENT_STARTED" | "CONTENT_PROGRESS" | "CONTENT_COMPLETED", payload?: Record<string, unknown>) => void;
  recordSignalBatch: (signals: PopsSignalItem[]) => void;
};

type UsePopsContentProgressInput = ProgressApi & {
  progressPct: number;
  started?: boolean;
  completed?: boolean;
};

export function usePopsContentProgress(input: UsePopsContentProgressInput) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current && input.started) {
      startedRef.current = true;
      input.recordEvent("CONTENT_STARTED", { progressPct: input.progressPct });
    }
  }, [input]);

  useEffect(() => {
    if (!startedRef.current) return;
    input.recordEvent("CONTENT_PROGRESS", { progressPct: input.progressPct });
    input.recordSignalBatch([
      { type: "CONTENT_PROGRESS", timestamp: Date.now(), value: input.progressPct },
    ]);
  }, [input.progressPct, input]);

  useEffect(() => {
    if (!input.completed) return;
    input.recordEvent("CONTENT_COMPLETED", { progressPct: 100 });
  }, [input.completed, input]);

  const checkpoint = useCallback(
    (value: number) => {
      input.recordEvent("CONTENT_PROGRESS", { progressPct: value });
      input.recordSignalBatch([{ type: "CONTENT_PROGRESS", timestamp: Date.now(), value }]);
    },
    [input],
  );

  return { checkpoint };
}

