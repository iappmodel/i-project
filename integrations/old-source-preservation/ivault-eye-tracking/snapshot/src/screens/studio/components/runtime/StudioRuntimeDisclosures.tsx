import type { PostDisclosure } from "../../publish/studioPublishTypes";
import type { Dispatch } from "react";
import type { RuntimeFeedAction } from "../../feed/studioFeedRuntimeStore";

export function StudioRuntimeDisclosures({
  postId,
  disclosures,
  viewerAccountId,
  feedDispatch,
}: {
  postId: string;
  disclosures: PostDisclosure[];
  viewerAccountId: string;
  feedDispatch: Dispatch<RuntimeFeedAction>;
}) {
  const required = disclosures.filter((d) => d.required && d.visibleToViewer !== false);
  const optional = disclosures.filter((d) => !d.required && d.visibleToViewer !== false);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
      {required.map((d) => (
        <button
          key={d.id}
          type="button"
          className="ist-chip"
          style={{ fontSize: 10, cursor: "pointer" }}
          title={d.message}
          onClick={() =>
            feedDispatch({
              type: "RECORD_VIEWER_ACTION",
              postId,
              viewerAccountId,
              action: "disclosure_opened",
              metadata: { disclosureId: d.id, label: d.label },
            })
          }
        >
          {d.label}
        </button>
      ))}
      {optional.map((d) => (
        <button
          key={d.id}
          type="button"
          className="ist-chip ist-chip--ghost"
          style={{ fontSize: 10, cursor: "pointer", opacity: 0.85 }}
          title={d.message}
          onClick={() =>
            feedDispatch({
              type: "RECORD_VIEWER_ACTION",
              postId,
              viewerAccountId,
              action: "disclosure_opened",
              metadata: { disclosureId: d.id, label: d.label },
            })
          }
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
