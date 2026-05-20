import type { AdminCommandItemRow } from "@/lib/admin-command-center/admin-command-center-client";
import { AdminCommandCenterActionBadge } from "./AdminCommandCenterActionBadge";

export function AdminCommandCenterActionPanel(props: {
  item: AdminCommandItemRow;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h3 className="text-sm font-semibold text-neutral-100">Recommended Actions</h3>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Recommended</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(props.item.recommended_actions ?? []).map((action) => (
              <AdminCommandCenterActionBadge key={action} action={action} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Approved</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(props.item.approved_actions ?? []).length ? (
              props.item.approved_actions.map((action) => (
                <AdminCommandCenterActionBadge key={action} action={action} tone="approved" />
              ))
            ) : (
              <span className="text-sm text-neutral-500">None</span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500">Rejected</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(props.item.rejected_actions ?? []).length ? (
              props.item.rejected_actions.map((action) => (
                <AdminCommandCenterActionBadge key={action} action={action} tone="rejected" />
              ))
            ) : (
              <span className="text-sm text-neutral-500">None</span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-5 rounded-xl border border-yellow-900 bg-yellow-950/30 p-4 text-sm text-yellow-200">
        Actions here are review decisions only. Money, wallet, campaign, and provider changes must be executed by
        their dedicated audited systems.
      </p>
    </section>
  );
}
