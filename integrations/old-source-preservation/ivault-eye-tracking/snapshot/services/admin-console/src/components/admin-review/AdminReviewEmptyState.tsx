export function AdminReviewEmptyState(props: {
  title: string;
  body?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950 p-10 text-center">
      <h3 className="text-sm font-semibold text-neutral-200">{props.title}</h3>
      {props.body ? (
        <p className="mt-2 text-sm text-neutral-500">{props.body}</p>
      ) : null}
    </div>
  );
}
