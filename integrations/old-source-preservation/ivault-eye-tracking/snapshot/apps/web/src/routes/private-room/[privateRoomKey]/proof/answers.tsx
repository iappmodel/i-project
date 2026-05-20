import React from "react";
import { TrustProofPortalLayout } from "./components";

export default function TrustProofAnswersRoute() {
  const dashboard = {
    portal: { title: "Trust Proof", subtitle: "Answers" },
    crypto: { hasCryptoProof: true }
  };

  return (
    <TrustProofPortalLayout dashboard={dashboard}>
      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Ask evidence-backed questions</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page should create an answer session token and call
          `/v1/evidence-answers/generate`.
        </p>
      </section>
    </TrustProofPortalLayout>
  );
}
