import type { ServerResponse } from "node:http";

export interface ProofSealedEvent {
  type: "proof-sealed";
  sessionId: string;
  localUserRef: string | null;
  mode: "pending" | "full";
  reviewStatus: string;
  holdOutcome: string | null;
  timestamp: string;
  source: "web" | "flutter" | "unknown";
}

interface ProofEventSubscriber {
  res: ServerResponse;
  localUserRef: string | null;
}

const subscribers = new Set<ProofEventSubscriber>();

export function subscribeProofEvents(
  res: ServerResponse,
  localUserRef: string | null = null
): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(": connected\n\n");
  const entry: ProofEventSubscriber = { res, localUserRef };
  subscribers.add(entry);
  res.on("close", () => {
    subscribers.delete(entry);
  });
}

function matchesFilter(
  subscriberRef: string | null,
  eventRef: string | null
): boolean {
  if (!subscriberRef) return true;
  if (!eventRef) return true;
  return subscriberRef === eventRef;
}

export function broadcastProofSealed(event: ProofSealedEvent): void {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const sub of subscribers) {
    if (!matchesFilter(sub.localUserRef, event.localUserRef)) continue;
    try {
      sub.res.write(payload);
    } catch {
      subscribers.delete(sub);
    }
  }
}

export function proofEventSubscriberCount(): number {
  return subscribers.size;
}

export function inferProofSource(runtimeVersion?: string | null): ProofSealedEvent["source"] {
  const rv = runtimeVersion?.toLowerCase() ?? "";
  if (rv.includes("flutter")) return "flutter";
  if (rv.includes("web") || rv.includes("vite")) return "web";
  return "unknown";
}
