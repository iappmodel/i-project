import React from "react";
import { PublishedProofStatusTable } from "./PublishedProofStatusTable";
import { TrustCenterSections } from "./TrustCenterSections";
import { TrustNoticeList } from "./TrustNoticeList";

export function TrustTransparencyPortal({
  portal,
  sections,
  notices,
  proofs
}: {
  portal: any;
  sections: any[];
  notices: any[];
  proofs: any[];
}) {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-2xl border p-6">
        <p className="text-xs uppercase text-muted-foreground">Trust Center</p>
        <h1 className="mt-2 text-3xl font-semibold">{portal.title}</h1>
        {portal.subtitle ? <p className="mt-2 text-lg text-muted-foreground">{portal.subtitle}</p> : null}
        {portal.description ? (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{portal.description}</p>
        ) : null}
      </section>

      <TrustCenterSections sections={sections} />

      <TrustNoticeList notices={notices} />

      <PublishedProofStatusTable proofs={proofs} />
    </main>
  );
}
