import React, { useEffect, useState } from "react";
import { PublicVerificationResult } from "../../components/PublicVerificationResult";
import { resolveProofLink } from "../../lib/proof-links-api";

export default function ProofDeepLinkPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const token = url.searchParams.get("token");

    if (!code || !token) {
      setError("Missing proof link parameters.");
      setState("error");
      return;
    }

    resolveProofLink(code, token)
      .then((response) => {
        setData(response.data);
        setState("ready");
      })
      .catch((err) => {
        setError(err?.message ?? "Proof link could not be resolved.");
        setState("error");
      });
  }, []);

  if (state === "loading") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-sm text-muted-foreground">Resolving proof link...</p>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-2xl font-semibold">Proof link failed</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </main>
    );
  }

  const result = data?.verificationResult;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-16">
      <section>
        <p className="text-sm text-muted-foreground">Proof Verification</p>
        <h1 className="text-3xl font-semibold">{data.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{data.summary}</p>
      </section>

      <section className="rounded-xl border p-5">
        <p className="text-xs text-muted-foreground">Proof key</p>
        <p className="mt-2 break-all font-mono text-xs">{data.proofKey}</p>

        <p className="mt-4 text-xs text-muted-foreground">Proof hash</p>
        <p className="mt-2 break-all font-mono text-xs">{data.proofHashSha256}</p>
      </section>

      {result ? (
        <PublicVerificationResult result={result} />
      ) : (
        <p className="text-sm text-muted-foreground">
          This proof link was resolved. Manual verification is required.
        </p>
      )}
    </main>
  );
}
