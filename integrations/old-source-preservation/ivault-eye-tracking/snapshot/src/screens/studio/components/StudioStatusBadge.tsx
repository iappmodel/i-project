import type { StudioProjectStatus } from "../studioTypes";

const LABEL: Record<StudioProjectStatus, string> = {
  empty: "Empty",
  draft: "Draft",
  ready: "Ready",
  saving: "Saving…",
  saved: "Saved",
  exporting: "Exporting…",
  exported: "Exported",
  published: "Published",
  failed: "Failed",
};

export function StudioStatusBadge({ status }: { status: StudioProjectStatus }) {
  const cls =
    status === "saved" || status === "ready"
      ? "ist-status-badge ist-status-badge--mint"
      : status === "exporting" || status === "saving"
        ? "ist-status-badge ist-status-badge--gold"
        : "ist-status-badge";
  return <span className={cls}>{LABEL[status]}</span>;
}
