"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RiskInboxAlertRow } from "@/lib/risk-inbox/risk-inbox-client";
import {
  acknowledgeRiskAlert,
  escalateRiskAlert,
  resolveRiskAlert
} from "@/lib/risk-inbox/risk-inbox-client";

const DEMO_ACTOR = "00000000-0000-4000-8000-000000000001";

export function RiskAlertActionPanel(props: { alert: RiskInboxAlertRow }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const alertId = props.alert.alert_id;
  const canAck =
    props.alert.status === "alert_open" ||
    props.alert.status === "alert_created" ||
    props.alert.status === "alert_escalated";
  const canResolve =
    props.alert.status !== "alert_resolved" &&
    props.alert.status !== "alert_dismissed" &&
    props.alert.status !== "alert_suppressed";
  const canEscalate =
    props.alert.status !== "alert_escalated" &&
    props.alert.status !== "alert_resolved" &&
    props.alert.status !== "alert_dismissed";

  async function run(action: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage(ok);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">Actions</h3>
      <p className="mt-1 text-xs text-neutral-500">
        Routing and triage only. No wallet or payout mutations from this panel.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        {canAck ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() => acknowledgeRiskAlert(alertId, DEMO_ACTOR), "Acknowledged.")
            }
            className="rounded-xl border border-yellow-900 bg-yellow-950/30 px-4 py-2 text-sm text-yellow-100 hover:bg-yellow-950/50 disabled:opacity-50"
          >
            Acknowledge
          </button>
        ) : null}

        {canEscalate ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  escalateRiskAlert({
                    alertId,
                    actorUserId: DEMO_ACTOR,
                    reasonCodes: ["manual_escalation"]
                  }),
                "Escalated."
              )
            }
            className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-2 text-sm text-red-100 hover:bg-red-950/50 disabled:opacity-50"
          >
            Escalate
          </button>
        ) : null}

        {canResolve ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  resolveRiskAlert({
                    alertId,
                    actorUserId: DEMO_ACTOR,
                    reasonCodes: ["manual_resolution"],
                    notes: "Resolved from Risk Inbox (demo)."
                  }),
                "Resolved."
              )
            }
            className="rounded-xl border border-emerald-900 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-100 hover:bg-emerald-950/50 disabled:opacity-50"
          >
            Resolve (demo)
          </button>
        ) : null}
      </div>

      {message ? <p className="mt-3 text-xs text-neutral-400">{message}</p> : null}
    </section>
  );
}
