"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SystemTimelineShell } from "@/components/system-timeline/SystemTimelineShell";
import { SystemTimelineView } from "@/components/system-timeline/SystemTimelineView";
import { fetchSystemTimelineByPath } from "@/lib/system-timeline/system-timeline-client";
import type { SystemTimelineObjectType, SystemTimelineResult } from "@/types/alphabet/system-timeline.types";

export default function AdminTimelineDetailPage() {
  const routeParams = useParams<{ objectType: string; objectId: string }>();
  const [timeline, setTimeline] = useState<SystemTimelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      setTimeline(null);
      try {
        const objectType = routeParams.objectType as SystemTimelineObjectType;
        const objectId = decodeURIComponent(routeParams.objectId);
        const result = await fetchSystemTimelineByPath({ objectType, objectId });
        if (!cancelled) setTimeline(result);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load timeline.");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [routeParams.objectType, routeParams.objectId]);

  return (
    <SystemTimelineShell
      title="System Object Timeline"
      description={`${routeParams.objectType}:${routeParams.objectId}`}
    >
      {error ? (
        <div className="rounded-2xl border border-red-900 bg-red-950/20 p-4 text-sm text-red-200">{error}</div>
      ) : null}
      {!error && !timeline ? (
        <p className="text-sm text-neutral-500">Loading timeline…</p>
      ) : null}
      {timeline ? <SystemTimelineView timeline={timeline} /> : null}
    </SystemTimelineShell>
  );
}
