import React, { useEffect } from "react";
import { useTipFlow } from "../hooks/useTipFlow";
import { useTipWallet } from "../hooks/useTipWallet";
import TipRecipientCard from "../components/TipRecipientCard";
import TipAmountSelector from "../components/TipAmountSelector";
import TipSourceSelector from "../components/TipSourceSelector";
import TipPrivacySelector from "../components/TipPrivacySelector";
import TipMessageBox from "../components/TipMessageBox";
import TipSafetyNotice from "../components/TipSafetyNotice";
import TipButton from "../components/TipButton";

export function TipSendScreen() {
  const flow = useTipFlow();
  const wallet = useTipWallet();

  useEffect(() => {
    wallet.reload();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold text-white">Send a Tip</h2>
      {flow.recipient ? <TipRecipientCard recipient={flow.recipient} /> : <div className="text-sm text-muted">Select a recipient</div>}
      <div>
        <label className="text-sm text-muted">Amount</label>
        <TipAmountSelector value={flow.amount} onChange={(v) => flow.setAmount(v)} />
      </div>
      <div>
        <label className="text-sm text-muted">Source</label>
        <TipSourceSelector sources={wallet.sources} selectedId={flow.source?.id ?? null} onSelect={(id) => flow.setSource(wallet.sources?.find(s=>s.id===id) ?? null)} />
      </div>
      <div>
        <label className="text-sm text-muted">Privacy</label>
        <TipPrivacySelector value={flow.privacy} onChange={(p) => flow.setPrivacy(p)} />
      </div>
      <div>
        <label className="text-sm text-muted">Message (optional)</label>
        <TipMessageBox value={flow.message} onChange={flow.updateMessage} />
      </div>
      <TipSafetyNotice />
      <div className="flex gap-2">
        <TipButton
          label="Continue"
          onClick={async () => {
            try {
              const draft = await flow.createDraft(
                flow.recipient?.id ?? "r_creator_1",
                wallet.sources?.[0]?.id ?? "s_wallet",
                flow.amount || 5
              );
              // Save draft to session for confirmation screen to pick up (frontend-only mock)
              try {
                sessionStorage.setItem("itip_draft", JSON.stringify(draft));
              } catch {
                // ignore storage errors in restrictive environments
              }
              window.location.assign("/itip/confirm");
            } catch (e) {
              // no-op
            }
          }}
        />
      </div>
    </div>
  );
}

export default TipSendScreen;

