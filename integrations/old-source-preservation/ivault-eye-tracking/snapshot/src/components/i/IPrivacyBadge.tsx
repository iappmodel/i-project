import type { IPrivacyLevel } from "../../lib/i/i-command.types";
import { privacyLabel } from "../../lib/i/i-command-privacy";

interface IPrivacyBadgeProps {
  level: IPrivacyLevel;
}

export function IPrivacyBadge({ level }: IPrivacyBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/50">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      <span>{privacyLabel(level)}</span>
    </div>
  );
}

