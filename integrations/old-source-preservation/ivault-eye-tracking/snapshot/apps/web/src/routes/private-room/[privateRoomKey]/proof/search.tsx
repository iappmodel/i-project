import React from "react";
import { TrustProofPortalLayout } from "./components";

export default function TrustProofSearchRoute() {
  const dashboard = {
    portal: { title: "Trust Proof", subtitle: "Search" },
    crypto: { hasCryptoProof: true }
  };

  return (
    <TrustProofPortalLayout dashboard={dashboard}>
      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Search evidence</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page should create a scoped search session token and call
          `/v1/artifact-search/execute` with the query.
        </p>
      </section>
    </TrustProofPortalLayout>
  );
}
