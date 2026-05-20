import React from "react";
import { useState } from "react";

export function TrustProofPortalLayout({
  children,
  dashboard
}: {
  children: React.ReactNode;
  dashboard: any;
}) {
  return (
    <main className="min-h-screen bg-background">
      <section className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm text-muted-foreground">Trust Proof Portal</p>
            <h1 className="text-2xl font-semibold">{dashboard?.portal?.title}</h1>
            <p className="text-sm text-muted-foreground">{dashboard?.portal?.subtitle}</p>
          </div>

          <div className="rounded-full border px-3 py-1 text-xs">
            {dashboard?.crypto?.hasCryptoProof
              ? "Cryptographic proof active"
              : "Proof preparing"}
          </div>
        </div>
      </section>

      <nav className="border-b">
        <div className="mx-auto flex max-w-7xl gap-4 overflow-x-auto px-6 py-3 text-sm">
          <a href="./">Overview</a>
          <a href="./artifacts">Artifacts</a>
          <a href="./search">Search</a>
          <a href="./answers">Answers</a>
          <a href="./receipts">Receipts</a>
          <a href="./exports">Exports</a>
          <a href="./downloads">Downloads</a>
          <a href="./timeline">Timeline</a>
          <a href="./crypto">Crypto Proof</a>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-8">{children}</section>
    </main>
  );
}

export function TrustProofOverview({ dashboard }: { dashboard: any }) {
  const counts = dashboard?.counts ?? {};
  const crypto = dashboard?.crypto ?? {};

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-4">
        <ProofMetric label="Artifacts" value={counts.readyArtifacts ?? 0} />
        <ProofMetric label="Answers" value={counts.answers ?? 0} />
        <ProofMetric label="Receipts" value={counts.receipts ?? 0} />
        <ProofMetric label="Timeline events" value={counts.timelineEvents ?? 0} />
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Proof status</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This room contains scoped trust artifacts, evidence-based answers, signed
          receipts, exportable proof bundles, and a chronological proof timeline.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <ProofHash label="Latest chain hash" value={crypto.latestChainHash} />
          <ProofHash label="Latest checkpoint" value={crypto.latestCheckpointHash} />
          <ProofHash label="Latest Merkle root" value={crypto.latestMerkleRoot} />
        </div>
      </section>
    </div>
  );
}

function ProofMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function ProofHash({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 break-all font-mono text-xs">{value ?? "Not available yet"}</p>
    </div>
  );
}

export function ArtifactProofCard({ artifact }: { artifact: any }) {
  return (
    <article className="rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            {artifact.artifactType}
          </p>
          <h3 className="mt-1 font-semibold">{artifact.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{artifact.summary}</p>
        </div>

        <span className="rounded-full border px-3 py-1 text-xs">{artifact.status}</span>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
        <span>Visibility: {artifact.visibility}</span>
        <span>Sensitivity: {artifact.sensitivity}</span>
        <span>Redaction: {artifact.redactionPolicy}</span>
      </div>

      <div className="mt-5 flex gap-3">
        <button className="rounded-md border px-3 py-2 text-sm">Open preview</button>
        {artifact.downloadable && (
          <button className="rounded-md border px-3 py-2 text-sm">Request download</button>
        )}
      </div>
    </article>
  );
}

export function TimelineEventCard({ event }: { event: any }) {
  return (
    <article className="rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">
            {new Date(event.eventTime).toLocaleString()} · {event.eventFamily}
          </p>
          <h3 className="mt-1 font-semibold">{event.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{event.summary}</p>
        </div>

        <span className="rounded-full border px-3 py-1 text-xs">{event.riskLevel}</span>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
        <span>Action: {event.eventAction}</span>
        <span>Actor: {event.actorEmail ?? event.actorType}</span>
        <span>Artifact: {event.artifactKey ?? "—"}</span>
        <span>Receipt: {event.receiptKey ?? "—"}</span>
      </div>

      <div className="mt-4 rounded-md bg-muted p-3">
        <p className="text-xs text-muted-foreground">Immutable hash</p>
        <p className="break-all font-mono text-xs">{event.immutableHashSha256}</p>
      </div>
    </article>
  );
}

export function CryptoProofStatusPanel({ crypto }: { crypto: any }) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl border p-6">
        <h2 className="text-lg font-semibold">Cryptographic continuity</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This proof timeline is chained. Each event commits to the previous chain
          head, making silent rewriting detectable.
        </p>

        <div className="mt-5 grid gap-4">
          <ProofRow
            label="Chain verified"
            value={String(crypto?.verification?.verified ?? false)}
          />
          <ProofRow label="Event count" value={String(crypto?.chain?.eventCount ?? 0)} />
          <ProofRow
            label="Last sequence"
            value={String(crypto?.chain?.lastSequenceNumber ?? "—")}
          />
          <ProofRow label="Chain head" value={crypto?.chain?.lastChainHashSha256 ?? "—"} />
          <ProofRow
            label="Latest checkpoint"
            value={crypto?.checkpoint?.checkpointHashSha256 ?? "—"}
          />
          <ProofRow
            label="Latest Merkle root"
            value={crypto?.merkle?.merkleRootSha256 ?? "—"}
          />
          <ProofRow
            label="Latest anchor"
            value={crypto?.anchor?.anchoredHashSha256 ?? "—"}
          />
        </div>
      </section>
    </div>
  );
}

function ProofRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 break-all font-mono text-xs">{value}</p>
    </div>
  );
}

export function ProofQrCard({ link, qr }: { link: any; qr?: any }) {
  return (
    <article className="rounded-xl border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase text-muted-foreground">
            {link.proofType}
          </p>
          <h3 className="mt-1 font-semibold">{link.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{link.summary}</p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs">
          {link.status}
        </span>
      </div>

      <div className="mt-4 rounded-md bg-muted p-3">
        <p className="text-xs text-muted-foreground">Verification URL</p>
        <p className="mt-2 break-all font-mono text-xs">{link.verificationUrl}</p>
      </div>

      <div className="mt-4 rounded-md bg-muted p-3">
        <p className="text-xs text-muted-foreground">Proof hash</p>
        <p className="mt-2 break-all font-mono text-xs">{link.proofHashSha256}</p>
      </div>

      {qr ? (
        <div className="mt-4 text-sm text-muted-foreground">
          QR status: {qr.status}
        </div>
      ) : null}
    </article>
  );
}

export function ProofDigestPreferences({
  privateRoomKey,
  defaultEmail
}: {
  privateRoomKey: string;
  defaultEmail: string;
}) {
  const [recipientEmail, setRecipientEmail] = useState(defaultEmail);
  const [digestFrequency, setDigestFrequency] = useState("daily");
  const [status, setStatus] = useState<string | null>(null);

  async function save() {
    setStatus(null);

    const res = await fetch(
      `/v1/proof-digests/private-room/${privateRoomKey}/subscriptions`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          recipientEmail,
          digestFrequency,
          digestChannel: "email",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC"
        })
      }
    );

    if (!res.ok) {
      setStatus("Failed to save digest preferences.");
      return;
    }

    setStatus("Digest preferences saved.");
  }

  return (
    <section className="rounded-xl border p-5">
      <h2 className="text-lg font-semibold">Proof digest</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Get a digest when new proof activity happens in this room, including
        reports, receipts, verification links, QR codes, timeline activity, and
        verification alerts.
      </p>

      <div className="mt-5 space-y-4">
        <label className="block text-sm">
          Email
          <input
            className="mt-1 w-full rounded-md border p-2"
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
          />
        </label>

        <label className="block text-sm">
          Frequency
          <select
            className="mt-1 w-full rounded-md border p-2"
            value={digestFrequency}
            onChange={(event) => setDigestFrequency(event.target.value)}
          >
            <option value="immediate">Immediate</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>

        <button
          className="rounded-md border px-4 py-2 text-sm"
          onClick={() => void save()}
        >
          Save digest preferences
        </button>

        {status && <p className="text-sm text-muted-foreground">{status}</p>}
      </div>
    </section>
  );
}
