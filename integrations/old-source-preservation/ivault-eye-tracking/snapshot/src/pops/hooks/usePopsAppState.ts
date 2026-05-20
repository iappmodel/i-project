import { useEffect } from "react";
import type { PopsSignalItem } from "../capture/pops-client-events";

type AppStateApi = {
  recordEvent: (
    eventType: "SCREEN_ACTIVE" | "APP_FOREGROUNDED" | "APP_BACKGROUNDED" | "NOTIFICATION_INTERRUPTION" | "DEVICE_INTEGRITY_WARNING",
    payload?: Record<string, unknown>,
  ) => void;
  recordSignalBatch: (signals: PopsSignalItem[]) => void;
};

type UsePopsAppStateInput = AppStateApi & {
  isForeground: boolean;
  screenActive: boolean;
  integrityOk: boolean;
  continuityOk: boolean;
};

export function usePopsAppState(input: UsePopsAppStateInput) {
  useEffect(() => {
    input.recordEvent("SCREEN_ACTIVE", { active: input.screenActive });
    input.recordSignalBatch([{ type: "SCREEN_ACTIVE", timestamp: Date.now(), value: input.screenActive }]);
  }, [input.screenActive, input]);

  useEffect(() => {
    const now = Date.now();
    if (input.isForeground) {
      input.recordEvent("APP_FOREGROUNDED");
      input.recordSignalBatch([{ type: "APP_FOREGROUNDED", timestamp: now }]);
      return;
    }
    input.recordEvent("APP_BACKGROUNDED");
    input.recordSignalBatch([{ type: "APP_BACKGROUNDED", timestamp: now }]);
  }, [input.isForeground, input]);

  useEffect(() => {
    if (input.integrityOk) return;
    input.recordEvent("DEVICE_INTEGRITY_WARNING", { integrityOk: false });
    input.recordSignalBatch([{ type: "DEVICE_INTEGRITY_WARNING", timestamp: Date.now(), value: false }]);
  }, [input.integrityOk, input]);

  useEffect(() => {
    input.recordSignalBatch([
      { type: "ACCOUNT_CONTINUITY_OK", timestamp: Date.now(), value: input.continuityOk },
    ]);
  }, [input.continuityOk, input]);

  const recordNotificationInterruption = () => {
    const now = Date.now();
    input.recordEvent("NOTIFICATION_INTERRUPTION");
    input.recordSignalBatch([{ type: "NOTIFICATION_INTERRUPTION", timestamp: now }]);
  };

  return { recordNotificationInterruption };
}

