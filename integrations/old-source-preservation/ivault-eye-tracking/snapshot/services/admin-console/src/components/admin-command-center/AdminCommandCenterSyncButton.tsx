"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postCommandCenterSync } from "@/lib/admin-command-center/admin-command-center-client";

export function AdminCommandCenterSyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSync() {
    setBusy(true);
    setMessage(null);
    try {
      const json = (await postCommandCenterSync()) as { result?: { createdCount?: number } };
      setMessage(`Synced: ${json.result?.createdCount ?? 0} new items.`);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onSync()}
        className="rounded-full border border-violet-700 bg-violet-950/40 px-4 py-2 text-sm text-violet-100 hover:bg-violet-900/50 disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync queue from sources"}
      </button>
      {message ? <p className="max-w-xs text-right text-xs text-neutral-400">{message}</p> : null}
    </div>
  );
}
