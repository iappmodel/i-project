export function AdminReviewLoadingState() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8">
      <div className="h-4 w-48 animate-pulse rounded bg-neutral-800" />
      <div className="mt-4 space-y-3">
        <div className="h-10 animate-pulse rounded bg-neutral-900" />
        <div className="h-10 animate-pulse rounded bg-neutral-900" />
        <div className="h-10 animate-pulse rounded bg-neutral-900" />
      </div>
    </div>
  );
}
