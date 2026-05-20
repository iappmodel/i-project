import React from "react";
import { ArtifactProofCard, TrustProofPortalLayout } from "./components";

export default function TrustProofArtifactsRoute() {
  const dashboard = {
    portal: { title: "Trust Proof", subtitle: "Artifacts" },
    crypto: { hasCryptoProof: true }
  };

  const artifacts: any[] = [];

  return (
    <TrustProofPortalLayout dashboard={dashboard}>
      <div className="space-y-4">
        {artifacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No artifacts yet.</p>
        ) : (
          artifacts.map((artifact) => (
            <ArtifactProofCard key={artifact.viewerSubjectKey} artifact={artifact} />
          ))
        )}
      </div>
    </TrustProofPortalLayout>
  );
}
