import React from "react";
import {
  ProofDigestPreferences,
  TrustProofOverview,
  TrustProofPortalLayout
} from "./components";

export default function TrustProofOverviewRoute() {
  const privateRoomKey =
    typeof window !== "undefined"
      ? window.location.pathname.split("/")[2] ?? ""
      : "";

  const dashboard = {
    portal: {
      title: "Trust Proof",
      subtitle: "Customer-facing evidence and verification portal"
    },
    counts: {
      readyArtifacts: 0,
      answers: 0,
      receipts: 0,
      timelineEvents: 0
    },
    crypto: {
      hasCryptoProof: false,
      latestChainHash: null,
      latestCheckpointHash: null,
      latestMerkleRoot: null
    }
  };

  return (
    <TrustProofPortalLayout dashboard={dashboard}>
      <div className="space-y-8">
        <TrustProofOverview dashboard={dashboard} />
        <ProofDigestPreferences privateRoomKey={privateRoomKey} defaultEmail="" />
      </div>
    </TrustProofPortalLayout>
  );
}
