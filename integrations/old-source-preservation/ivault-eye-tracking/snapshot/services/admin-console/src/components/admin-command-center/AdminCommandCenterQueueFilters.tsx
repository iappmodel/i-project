import Link from "next/link";

const filters = [
  "global",
  "risk",
  "finance",
  "wallet",
  "payout",
  "campaign",
  "identity",
  "compliance",
  "system"
] as const;

export function AdminCommandCenterQueueFilters() {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
      <Link
        href="/admin/command-center"
        className="rounded-full border border-violet-900/50 px-3 py-1.5 text-xs text-violet-200 hover:bg-neutral-900"
      >
        all scopes
      </Link>
      {filters.map((filter) => (
        <Link
          key={filter}
          href={`/admin/command-center?queueScope=${filter}`}
          className="rounded-full border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-900"
        >
          {filter}
        </Link>
      ))}
    </div>
  );
}
