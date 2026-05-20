import { AdminCommandCenterShell } from "@/components/admin-command-center/AdminCommandCenterShell";
import { AdminCommandCenterSummaryCards } from "@/components/admin-command-center/AdminCommandCenterSummaryCards";
import { AdminCommandCenterQueueFilters } from "@/components/admin-command-center/AdminCommandCenterQueueFilters";
import { AdminCommandCenterQueue } from "@/components/admin-command-center/AdminCommandCenterQueue";
import { AdminCommandCenterSyncButton } from "@/components/admin-command-center/AdminCommandCenterSyncButton";
import {
  getAdminCommandCenterSummary,
  listAdminCommandItems
} from "@/lib/alphabet/admin-command-center/admin-command-center-store";
import type { AdminCommandItemRow } from "@/lib/admin-command-center/admin-command-center-client";

type PageProps = {
  searchParams?: Promise<{ queueScope?: string }>;
};

const DEFAULT_ADMIN_ACTOR =
  process.env.NEXT_PUBLIC_ADMIN_ACTOR_ID ?? "00000000-0000-4000-8000-000000000001";

export default async function AdminCommandCenterPage(props: PageProps) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const queueScope = searchParams.queueScope ?? null;

  const [summary, items] = await Promise.all([
    getAdminCommandCenterSummary(DEFAULT_ADMIN_ACTOR),
    listAdminCommandItems({
      queueScope,
      limit: 100
    })
  ]);

  return (
    <AdminCommandCenterShell
      title="Command Center"
      description="Unified risk, finance, wallet, payout, audit, compliance, and system control queue."
    >
      <div className="space-y-6">
        <div className="flex flex-col justify-end gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1" />
          <AdminCommandCenterSyncButton />
        </div>
        <AdminCommandCenterSummaryCards summary={summary} />
        <AdminCommandCenterQueueFilters />
        <AdminCommandCenterQueue items={items as unknown as AdminCommandItemRow[]} />
      </div>
    </AdminCommandCenterShell>
  );
}
