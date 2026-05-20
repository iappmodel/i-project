import type { SystemObjectNode } from "@/types/alphabet/system-timeline.types";

export function SystemObjectNodeCard(props: { node: SystemObjectNode }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-black p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-neutral-200">{props.node.label}</p>
        {props.node.status ? (
          <span className="rounded-full border border-neutral-700 px-2 py-1 text-xs text-neutral-400">
            {props.node.status}
          </span>
        ) : null}
      </div>

      <p className="mt-2 font-mono text-xs text-neutral-500">
        {props.node.objectType}:{props.node.objectId}
      </p>
    </div>
  );
}
