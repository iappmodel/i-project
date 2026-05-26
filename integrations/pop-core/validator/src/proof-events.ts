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

const subscribers = new Set<ServerResponse>();

export function subscribeProofEvents(res: ServerResponse): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(": connected\n\n");
  subscribers.add(res);
  res.on("close", () => {
    subscribers.delete(res);
  });
}

export function broadcastProofSealed(event: ProofSealedEvent): void {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of subscribers) {
    try {
      res.write(payload);
    } catch {
      subscribers.delete(res);
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
