import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from "react";
import { initialRuntimeFeedState, runtimeFeedReducer, type RuntimeFeedAction, type RuntimeFeedState } from "./studioFeedRuntimeStore";

export type RuntimeFeedContextValue = {
  feedState: RuntimeFeedState;
  feedDispatch: Dispatch<RuntimeFeedAction>;
};

const RuntimeFeedContext = createContext<RuntimeFeedContextValue | null>(null);

export function RuntimeFeedProvider({ children }: { children: ReactNode }) {
  const [feedState, feedDispatch] = useReducer(runtimeFeedReducer, initialRuntimeFeedState);
  const value = useMemo(() => ({ feedState, feedDispatch }), [feedState, feedDispatch]);
  return <RuntimeFeedContext.Provider value={value}>{children}</RuntimeFeedContext.Provider>;
}

export function useRuntimeFeed(): RuntimeFeedContextValue {
  const ctx = useContext(RuntimeFeedContext);
  if (!ctx) {
    throw new Error("useRuntimeFeed must be used within RuntimeFeedProvider");
  }
  return ctx;
}
