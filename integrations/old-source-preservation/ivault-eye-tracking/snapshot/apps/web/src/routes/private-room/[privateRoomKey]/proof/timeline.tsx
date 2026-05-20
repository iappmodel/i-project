import React from "react";
import { TimelineEventCard, TrustProofPortalLayout } from "./components";

export default function TrustProofTimelineRoute() {
  const dashboard = {
    portal: { title: "Trust Proof", subtitle: "Timeline" },
    crypto: { hasCryptoProof: true }
  };
  const timeline: any[] = [];

  return (
    <TrustProofPortalLayout dashboard={dashboard}>
      <div className="space-y-4">
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeline events yet.</p>
        ) : (
          timeline.map((event) => (
            <TimelineEventCard key={event.timelineEventKey} event={event} />
          ))
        )}
      </div>
    </TrustProofPortalLayout>
  );
}
