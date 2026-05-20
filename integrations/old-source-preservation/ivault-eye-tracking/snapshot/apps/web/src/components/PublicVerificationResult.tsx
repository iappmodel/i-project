import React from "react";

export function PublicVerificationResult({ result }: { result: any }) {
  const verified = Boolean(result?.verified);
  const status = result?.verificationStatus ?? "unknown";

  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-xl font-semibold">Verification Result</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Status: {status}
      </p>
      <p className="mt-1 text-sm">
        {verified ? "Verified" : "Not verified"}
      </p>
      {result?.failureReason ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Failure reason: {result.failureReason}
        </p>
      ) : null}
    </section>
  );
}
