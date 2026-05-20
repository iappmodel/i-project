import React from "react";
import { TrustProofPortalLayout } from "./components";

export default function TrustProofDownloadsRoute() {
  const dashboard = {
    portal: { title: "Trust Proof", subtitle: "Downloads" },
    crypto: { hasCryptoProof: true }
  };

  return (
    <TrustProofPortalLayout dashboard={dashboard}>
      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Download proof</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Use scoped download grants and short-lived URLs for download requests.
        </p>
      </section>
    </TrustProofPortalLayout>
  );
}
