import React from "react";
import { TrustProofPortalLayout } from "./components";

export default function TrustProofExportsRoute() {
  const dashboard = {
    portal: { title: "Trust Proof", subtitle: "Exports" },
    crypto: { hasCryptoProof: true }
  };

  return (
    <TrustProofPortalLayout dashboard={dashboard}>
      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Export bundles</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page should call `/v1/answer-receipt-exports/bundles` and display
          bundle/verification status.
        </p>
      </section>
    </TrustProofPortalLayout>
  );
}
