export function AdminReviewErrorState(props: {
  message?: string;
}) {
  return (
    <div className="rounded-2xl border border-red-900 bg-red-950/30 p-6">
      <h3 className="text-sm font-semibold text-red-200">Review console error</h3>
      <p className="mt-2 text-sm text-red-300">
        {props.message ?? "Something failed while loading review data."}
      </p>
    </div>
  );
}
