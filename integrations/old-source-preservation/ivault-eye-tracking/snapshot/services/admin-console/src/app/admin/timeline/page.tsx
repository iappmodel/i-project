import { SystemTimelineSearch } from "@/components/system-timeline/SystemTimelineSearch";
import { SystemTimelineShell } from "@/components/system-timeline/SystemTimelineShell";
import { SystemTimelineFilters } from "@/components/system-timeline/SystemTimelineFilters";

export default function AdminTimelinePage() {
  return (
    <SystemTimelineShell
      title="System Timeline"
      description="Open a chronological audit timeline and object graph for any platform object (read-only observability)."
    >
      <div className="space-y-4">
        <SystemTimelineFilters />
        <SystemTimelineSearch />
      </div>
    </SystemTimelineShell>
  );
}
