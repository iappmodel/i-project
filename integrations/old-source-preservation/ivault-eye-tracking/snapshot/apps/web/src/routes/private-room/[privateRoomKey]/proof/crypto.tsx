import React from "react";
import { CryptoProofStatusPanel, TrustProofPortalLayout } from "./components";

export default function TrustProofCryptoRoute() {
  const dashboard = {
    portal: { title: "Trust Proof", subtitle: "Crypto Proof" },
    crypto: { hasCryptoProof: true }
  };
  const crypto = {
    verification: { verified: false },
    chain: { eventCount: 0, lastSequenceNumber: "—", lastChainHashSha256: "—" },
    checkpoint: { checkpointHashSha256: "—" },
    merkle: { merkleRootSha256: "—" },
    anchor: { anchoredHashSha256: "—" }
  };

  return (
    <TrustProofPortalLayout dashboard={dashboard}>
      <CryptoProofStatusPanel crypto={crypto} />
    </TrustProofPortalLayout>
  );
}
