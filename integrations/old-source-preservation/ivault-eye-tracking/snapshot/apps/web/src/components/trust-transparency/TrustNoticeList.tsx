import React from "react";

export function TrustNoticeList({ notices }: { notices: any[] }) {
  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-semibold">Trust notices</h2>

      {!notices.length ? (
        <p className="mt-3 text-sm text-muted-foreground">No published trust notices.</p>
      ) : null}

      <div className="mt-5 space-y-3">
        {notices.map((notice) => (
          <article key={notice.admin_security_published_trust_notice_id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">
                  {notice.notice_type} · {notice.public_severity}
                </p>
                <h3 className="mt-1 font-medium">{notice.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{notice.summary}</p>
              </div>

              <span className="rounded-full border px-3 py-1 text-xs">{notice.status}</span>
            </div>

            {notice.body ? <p className="mt-4 text-sm leading-6">{notice.body}</p> : null}

            {notice.proof_key ? (
              <p className="mt-3 break-all font-mono text-xs text-muted-foreground">
                Proof: {notice.proof_key}
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
