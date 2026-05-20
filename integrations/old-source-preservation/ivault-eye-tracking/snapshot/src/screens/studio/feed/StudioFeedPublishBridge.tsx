import { useEffect, useRef } from "react";
import type { StudioController } from "../studioStore";
import { useRuntimeFeed } from "./RuntimeFeedContext";

/**
 * When a project is published locally, merge its `postPackage` into the runtime feed studio slot.
 */
export function StudioFeedPublishBridge({ studio }: { studio: StudioController }) {
  const { feedDispatch } = useRuntimeFeed();
  const lastMergedPackageId = useRef<string | null>(null);

  useEffect(() => {
    const { project } = studio.state;
    if (project.publishStatus !== "published" || !project.postPackage) return;
    const id = project.postPackage.id;
    if (id === lastMergedPackageId.current) return;
    lastMergedPackageId.current = id;
    feedDispatch({ type: "MERGE_PUBLISHED_STUDIO_POST", postPackage: project.postPackage });
  }, [studio.state, feedDispatch]);

  return null;
}
