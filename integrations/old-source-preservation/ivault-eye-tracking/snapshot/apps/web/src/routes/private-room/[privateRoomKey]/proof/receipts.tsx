import React from "react";
import { TrustProofPortalLayout } from "./components";

export default function TrustProofReceiptsRoute() {
  const dashboard = {
    portal: { title: "Trust Proof", subtitle: "Receipts" },
    crypto: { hasCryptoProof: true }
  };

  return (
    <TrustProofPortalLayout dashboard={dashboard}>
      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Signed receipts</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page should call `/v1/answer-receipts` and `/v1/answer-receipts/verify`
          with scoped answer/receipt tokens.
        </p>
      </section>
    </TrustProofPortalLayout>
  );
}
