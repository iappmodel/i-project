import type { SystemObjectEdge, SystemObjectNode } from "@/types/alphabet/system-timeline.types";
import { SystemObjectNodeCard } from "./SystemObjectNodeCard";

export function SystemObjectGraphView(props: {
  nodes: SystemObjectNode[];
  edges: SystemObjectEdge[];
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
      <h2 className="text-sm font-semibold text-neutral-100">Object Graph</h2>
      <p className="mt-1 text-xs text-neutral-500">
        {props.nodes.length} nodes / {props.edges.length} relations.
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {props.nodes.map((node) => (
          <SystemObjectNodeCard key={node.nodeId} node={node} />
        ))}
      </div>

      <details className="mt-5">
        <summary className="cursor-pointer text-xs text-neutral-500">Relations</summary>
        <pre className="mt-3 max-h-80 overflow-auto rounded-xl border border-neutral-900 bg-black p-3 text-xs text-neutral-300">
          {JSON.stringify(props.edges, null, 2)}
        </pre>
      </details>
    </section>
  );
}
