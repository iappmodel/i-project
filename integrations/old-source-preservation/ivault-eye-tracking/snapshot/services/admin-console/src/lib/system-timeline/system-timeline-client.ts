import type { SystemTimelineObjectType, SystemTimelineResult } from "@/types/alphabet/system-timeline.types";

type TimelineEnvelope = {
  ok: boolean;
  data?: { timeline: SystemTimelineResult };
  error?: unknown;
};

export async function fetchSystemTimeline(params: {
  objectType: SystemTimelineObjectType;
  objectId: string;
  includeRawPayloads?: boolean;
}): Promise<SystemTimelineResult> {
  const query = new URLSearchParams({
    objectType: params.objectType,
    objectId: params.objectId
  });

  if (params.includeRawPayloads) {
    query.set("includeRawPayloads", "true");
  }

  const res = await fetch(`/api/admin/system-timeline?${query.toString()}`, {
    cache: "no-store",
    headers: {
      "x-role": "admin"
    }
  });

  if (!res.ok) {
    throw new Error("Failed to load system timeline.");
  }

  const json = (await res.json()) as TimelineEnvelope;
  if (!json.ok || !json.data?.timeline) {
    throw new Error("Invalid system timeline response.");
  }
  return json.data.timeline;
}

export async function fetchSystemTimelineByPath(params: {
  objectType: SystemTimelineObjectType;
  objectId: string;
  includeRawPayloads?: boolean;
}): Promise<SystemTimelineResult> {
  const query = new URLSearchParams();
  if (params.includeRawPayloads) query.set("includeRawPayloads", "true");

  const qs = query.toString();
  const path = `/api/admin/system-timeline/${encodeURIComponent(params.objectType)}/${encodeURIComponent(params.objectId)}${qs ? `?${qs}` : ""}`;

  const res = await fetch(path, {
    cache: "no-store",
    headers: {
      "x-role": "admin"
    }
  });

  if (!res.ok) {
    throw new Error("Failed to load system timeline.");
  }

  const json = (await res.json()) as TimelineEnvelope;
  if (!json.ok || !json.data?.timeline) {
    throw new Error("Invalid system timeline response.");
  }
  return json.data.timeline;
}
