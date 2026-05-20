import type { UsePopsSessionResult } from "../hooks/usePopsSession";

export interface PopsDemoScenario {
  id: string;
  label: string;
  description: string;
  run: (actions: UsePopsSessionResult) => void;
}

export const POPS_DEMO_SCENARIOS: PopsDemoScenario[] = [
  {
    id: "CLEAN_FULL",
    label: "Clean full watch",
    description: "User watches enough content with the app active.",
    run: (a) => {
      a.reset();
      a.startSponsoredWatch();
      a.completeClean();
    },
  },
  {
    id: "PARTIAL_WATCH",
    label: "Partial watch",
    description: "User exits before full completion.",
    run: (a) => {
      a.reset();
      a.startSponsoredWatch();
      a.completePartial();
    },
  },
  {
    id: "BACKGROUND_FARM",
    label: "Background progress",
    description: "Content progresses while app is backgrounded.",
    run: (a) => {
      a.reset();
      a.startSponsoredWatch();
      a.simulateBackgroundFraud();
    },
  },
  {
    id: "DEVICE_WARNING",
    label: "Device warning",
    description: "Device integrity signal is low.",
    run: (a) => {
      a.reset();
      a.startSponsoredWatch();
      a.simulateDeviceWarning();
    },
  },
  {
    id: "IMPOSSIBLE_FAST",
    label: "Impossible completion",
    description: "Session completes too fast for required duration.",
    run: (a) => {
      a.reset();
      a.startSponsoredWatch();
      a.simulateImpossibleCompletion();
    },
  },
  {
    id: "LOW_INTERACTION_CLEAN",
    label: "Low interaction but clean",
    description: "User watches passively without taps.",
    run: (a) => {
      a.reset();
      a.startSponsoredWatch();
      a.setProgress(100);
      a.completeClean();
    },
  },
];
