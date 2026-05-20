import React, { useEffect, useState } from "react";
import TipConfirmationCard from "../components/TipConfirmationCard";
import TipButton from "../components/TipButton";
import { iTIPService } from "../iTIP.service";
import type { TipDraft } from "../iTIP.types";

export function TipConfirmationScreen() {
  const [draft, setDraft] = useState<TipDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!draft) {
      try {
        const raw = sessionStorage.getItem("itip_draft");
        if (raw) {
          const parsed = JSON.parse(raw) as TipDraft;
          setDraft(parsed);
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [draft]);

  if (!draft) return <div className="p-4 text-sm text-muted">No draft to confirm</div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold text-white">Confirm Tip</h2>
      <TipConfirmationCard draft={draft} />
      <div className="flex gap-2">
        <TipButton
          label="Confirm"
          onClick={async () => {
            setLoading(true);
            setError(null);
            try {
              const res = await iTIPService.submitTip(draft);
              // clear session draft
              try {
                sessionStorage.removeItem("itip_draft");
              } catch {}
              if (res.transaction) {
                // navigate to receipt view
                window.location.assign(`/itip/receipt/${res.transaction.id}`);
              } else {
                window.location.assign(`/itip/history`);
              }
            } catch (e: any) {
              setError(e?.message ?? "submit_failed");
            } finally {
              setLoading(false);
            }
          }}
        />
        <TipButton label="Cancel" variant="ghost" onClick={() => {
          try { sessionStorage.removeItem("itip_draft"); } catch {}
          window.location.assign("/itip");
        }} />
      </div>
      {loading && <div className="text-sm text-muted">Processing...</div>}
      {error && <div className="text-sm text-rose-400">Error: {error}</div>}
    </div>
  );
}

export default TipConfirmationScreen;

