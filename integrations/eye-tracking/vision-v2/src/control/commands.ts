export type RemoteAction = "next" | "previous" | "select" | "toggleMute" | "openSettings";

export type RemoteTarget = {
  id: string;
  action: RemoteAction;
  rect: DOMRect;
};

export const BLINK_ACTIONS: Record<number, RemoteAction> = {
  1: "select",
  2: "next",
  3: "previous"
};

