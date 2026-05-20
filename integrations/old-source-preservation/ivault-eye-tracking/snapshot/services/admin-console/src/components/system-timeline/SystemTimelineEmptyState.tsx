export function SystemTimelineEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 p-10 text-center">
      <h3 className="text-sm font-semibold text-neutral-200">No timeline entries</h3>
      <p className="mt-2 text-sm text-neutral-500">
        No related system objects were found for this root object, or the API is unavailable.
      </p>
    </div>
  );
}
