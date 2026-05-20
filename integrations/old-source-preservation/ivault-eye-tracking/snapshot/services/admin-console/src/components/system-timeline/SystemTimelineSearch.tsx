"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SystemTimelineObjectType } from "@/types/alphabet/system-timeline.types";

const objectTypes: SystemTimelineObjectType[] = [
  "user",
  "wallet",
  "wallet_account",
  "ledger_entry",
  "value_lot",
  "policy_decision",
  "pipeline",
  "saga",
  "execution_request",
  "external_transfer",
  "provider_reconciliation",
  "compensation",
  "admin_review_case",
  "audit_record",
  "notification",
  "alphabet_event",
  "idempotency_key",
  "dedupe_key"
];

export function SystemTimelineSearch() {
  const router = useRouter();
  const [objectType, setObjectType] = useState<SystemTimelineObjectType>("user");
  const [objectId, setObjectId] = useState("");

  function submit() {
    if (!objectId.trim()) return;
    router.push(`/admin/timeline/${objectType}/${encodeURIComponent(objectId.trim())}`);
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h2 className="text-sm font-semibold text-neutral-100">Open Timeline</h2>
      <p className="mt-1 text-xs text-neutral-500">
        Search any system object by type and ID. Requires Express API at <code className="text-neutral-400">ALPHABET_API_URL</code> for
        live data.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-[240px_1fr_auto]">
        <select
          value={objectType}
          onChange={(event) => setObjectType(event.target.value as SystemTimelineObjectType)}
          className="rounded-lg border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-100"
        >
          {objectTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <input
          value={objectId}
          onChange={(event) => setObjectId(event.target.value)}
          placeholder="object id"
          className="rounded-lg border border-neutral-800 bg-black px-3 py-2 font-mono text-sm text-neutral-100"
        />

        <button
          type="button"
          onClick={submit}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-950"
        >
          Open
        </button>
      </div>
    </section>
  );
}
