import Link from "next/link";
import type { AdminCommandItemRow } from "@/lib/admin-command-center/admin-command-center-client";
import {
  formatCommandDateTime,
  formatCommandId,
  formatCommandLabel
} from "@/lib/admin-command-center/admin-command-center-formatters";
import { AdminCommandCenterStatusBadge } from "./AdminCommandCenterStatusBadge";
import { AdminCommandCenterSeverityBadge } from "./AdminCommandCenterSeverityBadge";
import { AdminCommandCenterActionBadge } from "./AdminCommandCenterActionBadge";

export function AdminCommandCenterQueue(props: {
  items: AdminCommandItemRow[];
}) {
  if (!props.items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 p-10 text-center">
        <h3 className="text-sm font-semibold text-neutral-200">No command items</h3>
        <p className="mt-2 text-sm text-neutral-500">No active command center items found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {props.items.map((item) => (
        <Link
          key={item.command_item_id}
          href={`/admin/command-center/${item.command_item_id}`}
          className="block rounded-2xl border border-neutral-800 bg-neutral-950 p-5 hover:bg-neutral-900/50"
        >
          <div className="flex flex-col justify-between gap-4 lg:flex-row">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-xs text-violet-300">{formatCommandId(item.command_item_id)}</p>
                <AdminCommandCenterStatusBadge status={item.status} />
                <AdminCommandCenterSeverityBadge severity={item.severity} />
              </div>

              <h3 className="mt-3 text-base font-semibold text-neutral-100">{item.title}</h3>

              <p className="mt-1 max-w-3xl text-sm text-neutral-400">{item.summary}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {(item.recommended_actions ?? []).slice(0, 4).map((action) => (
                  <AdminCommandCenterActionBadge key={action} action={action} />
                ))}
              </div>
            </div>

            <div className="text-sm text-neutral-500 lg:text-right">
              <p>{formatCommandLabel(item.queue_scope)}</p>
              <p>{formatCommandLabel(item.priority)}</p>
              <p>{formatCommandDateTime(item.created_at)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
