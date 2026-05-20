import React from "react";

export function PublishedProofStatusTable({ proofs }: { proofs: any[] }) {
  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-semibold">Published proof status</h2>

      {!proofs.length ? (
        <p className="mt-3 text-sm text-muted-foreground">No published proof records.</p>
      ) : null}

      {!!proofs.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2">Proof</th>
                <th className="py-2">Status</th>
                <th className="py-2">Verified</th>
                <th className="py-2">Lifecycle</th>
                <th className="py-2">Hash</th>
              </tr>
            </thead>
            <tbody>
              {proofs.map((proof) => (
                <tr key={proof.admin_security_published_proof_status_id} className="border-t">
                  <td className="py-3">{proof.proof_title ?? proof.proof_type}</td>
                  <td className="py-3">{proof.proof_status}</td>
                  <td className="py-3">{proof.verified_count}</td>
                  <td className="py-3">{proof.lifecycle_status ?? "—"}</td>
                  <td className="py-3 font-mono text-xs">{proof.proof_hash_sha256?.slice(0, 16) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
