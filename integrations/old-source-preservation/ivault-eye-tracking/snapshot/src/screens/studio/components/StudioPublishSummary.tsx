import type { StudioController } from "../studioStore";

function canPublishFromChecks(project: StudioController["state"]["project"]): boolean {
  const checks = project.publishChecks ?? [];
  if (!checks.length) return false;
  return !checks.some((c) => c.blocking && (c.status === "failed" || c.status === "blocked"));
}

function canExportFromChecks(project: StudioController["state"]["project"]): boolean {
  const checks = project.publishChecks ?? [];
  if (!checks.length) return false;
  return !checks.some((c) => c.blocking && c.category === "export" && (c.status === "failed" || c.status === "blocked"));
}

export function StudioPublishSummary({ studio }: { studio: StudioController }) {
  const { project } = studio.state;
  const checks = project.publishChecks ?? [];

  return (
    <div className="ist-panel" style={{ padding: 10, marginBottom: 12, borderColor: "rgba(94,234,212,0.2)" }}>
      <div className="ist-display" style={{ fontSize: 12, fontWeight: 800, marginBottom: 8 }}>
        Publish snapshot
      </div>
      <div className="ist-mono" style={{ fontSize: 10, color: "var(--ist-muted)", display: "grid", gap: 4 }}>
        <div>Status: {project.publishStatus}</div>
        <div>Target: {project.publishTarget}</div>
        <div>Visibility: {project.visibility}</div>
        <div>Monetization: {project.monetizationMode}</div>
        <div>Age rating: {project.ageRating}</div>
        <div>Export manifest: {project.exportManifest ? "yes" : "no"}</div>
        <div>Post package: {project.postPackage ? project.postPackage.id : "—"}</div>
        <div>Published: {project.publishedPost ? project.publishedPost.id : "—"}</div>
        <div>Checks loaded: {checks.length}</div>
        <div>canExport (from checks): {canExportFromChecks(project) ? "yes" : "no"}</div>
        <div>canPublish (from checks): {canPublishFromChecks(project) ? "yes" : "no"}</div>
      </div>
    </div>
  );
}
