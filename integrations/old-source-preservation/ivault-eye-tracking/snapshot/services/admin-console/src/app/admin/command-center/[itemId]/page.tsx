import { notFound } from "next/navigation";
import { AdminCommandCenterShell } from "@/components/admin-command-center/AdminCommandCenterShell";
import { AdminCommandCenterItemDetail } from "@/components/admin-command-center/AdminCommandCenterItemDetail";
import { getAdminCommandItem } from "@/lib/alphabet/admin-command-center/admin-command-center-store";
import type { AdminCommandItemRow } from "@/lib/admin-command-center/admin-command-center-client";

type PageProps = {
  params: Promise<{ itemId: string }>;
};

export default async function AdminCommandCenterDetailPage(props: PageProps) {
  const { itemId } = await props.params;
  const result = await getAdminCommandItem(itemId);

  if (!result) notFound();

  return (
    <AdminCommandCenterShell
      title="Command Item Detail"
      description="Evidence, recommended actions, decision controls, notes, and audit timeline."
    >
      <AdminCommandCenterItemDetail
        item={result.item as unknown as AdminCommandItemRow}
        timeline={result.timeline}
      />
    </AdminCommandCenterShell>
  );
}
