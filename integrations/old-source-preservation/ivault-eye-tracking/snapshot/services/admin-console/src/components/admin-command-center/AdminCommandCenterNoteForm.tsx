"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminCommandCenterHeaders } from "@/lib/admin-command-center/admin-command-center-client";

export function AdminCommandCenterNoteForm(props: { commandItemId: string }) {
  const router = useRouter();
  const [noteBody, setNoteBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/command-center/items/${props.commandItemId}/notes`, {
        method: "POST",
        headers: adminCommandCenterHeaders(),
        body: JSON.stringify({ noteBody: noteBody.trim() })
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok) throw new Error(json.message ?? "Failed to add note.");
      setNoteBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">Add internal note</h3>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-3 space-y-3">
        <textarea
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-neutral-800 bg-black px-3 py-2 text-sm text-neutral-200"
          placeholder="Note body (internal)…"
        />
        {error ? <p className="text-xs text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || !noteBody.trim()}
          className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save note"}
        </button>
      </form>
    </section>
  );
}
