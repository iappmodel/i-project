import { useCallback, useRef } from "react";
import type { PopsSignalItem } from "../capture/pops-client-events";

type InteractionApi = {
  recordEvent: (
    eventType: "TOUCH_TAP" | "TOUCH_SCROLL" | "TOUCH_SWIPE" | "MOTION_STABLE" | "MOTION_UNSTABLE",
    payload?: Record<string, unknown>,
  ) => void;
  recordSignalBatch: (signals: PopsSignalItem[]) => void;
};

export function usePopsInteractionCapture(api: InteractionApi) {
  const lastTouchRef = useRef<number>();

  const tap = useCallback(() => {
    const now = Date.now();
    api.recordEvent("TOUCH_TAP", { deltaMs: lastTouchRef.current ? now - lastTouchRef.current : undefined });
    api.recordSignalBatch([{ type: "TOUCH_TAP", timestamp: now }]);
    lastTouchRef.current = now;
  }, [api]);

  const scroll = useCallback((distance: number) => {
    const now = Date.now();
    api.recordEvent("TOUCH_SCROLL", { distance });
    api.recordSignalBatch([{ type: "TOUCH_SCROLL", timestamp: now, value: distance }]);
    lastTouchRef.current = now;
  }, [api]);

  const swipe = useCallback((direction: "left" | "right" | "up" | "down") => {
    const now = Date.now();
    api.recordEvent("TOUCH_SWIPE", { direction });
    api.recordSignalBatch([{ type: "TOUCH_SWIPE", timestamp: now, value: direction }]);
    lastTouchRef.current = now;
  }, [api]);

  const motion = useCallback(
    (stable: boolean) => {
      const now = Date.now();
      api.recordEvent(stable ? "MOTION_STABLE" : "MOTION_UNSTABLE");
      api.recordSignalBatch([
        {
          type: stable ? "MOTION_STABLE" : "MOTION_UNSTABLE",
          timestamp: now,
          value: stable,
        },
      ]);
    },
    [api],
  );

  return { tap, scroll, swipe, motion };
}

