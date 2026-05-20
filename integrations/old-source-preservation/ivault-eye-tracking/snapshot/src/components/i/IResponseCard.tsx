import type { ICommandEngineResult } from "../../lib/i/i-command.types";
import { I_COPY } from "../../lib/i/i-command-copy";
import { toICommandDisplayResult } from "../../lib/i/i-command-result";
import { IPrivacyBadge } from "./IPrivacyBadge";

interface IResponseCardProps {
  result: ICommandEngineResult;
  onPrimaryAction?: () => void;
  onRemember?: () => void;
  onForget?: () => void;
}

export function IResponseCard({
  result,
  onPrimaryAction,
  onRemember,
  onForget,
}: IResponseCardProps) {
  const display = toICommandDisplayResult(result);
  const { parse } = result;

  const blocked = display.flags.isBlocked;

  const shellClass = blocked
    ? "border-rose-500/35 bg-rose-950/[0.12] ring-2 ring-rose-500/25 shadow-[0_0_0_1px_rgba(251,113,133,0.15)]"
    : "border-white/10 bg-[#111118]";

  return (
    <div className={`rounded-2xl border p-5 shadow-2xl ${shellClass}`}>
      {blocked && (
        <p className="mb-4 rounded-lg border border-rose-400/30 bg-rose-950/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-rose-100/95">
          {I_COPY.blockedSafetyBanner}
        </p>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <IPrivacyBadge level={parse.privacyLevel} />
          <span className="truncate text-[10px] uppercase tracking-wide text-white/35">
            {display.privacyLabel}
          </span>
        </div>

        <div className="shrink-0 text-[11px] text-white/30">
          {Math.round(display.debug.confidence * 100)}%
        </div>
      </div>

      <h3 className="mb-2 font-display text-xl font-semibold tracking-tight text-white">
        {display.title}
      </h3>

      <p className="mb-5 text-sm leading-6 text-white/55">{display.message}</p>

      {display.flags.requiresConfirmation && (
        <p className="mb-4 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-100/90">
          {I_COPY.confirmationNotice}
        </p>
      )}

      {display.flags.requiresMemoryConsent && (
        <div className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
          <p className="mb-3 text-sm text-emerald-200">
            Should i remember this?
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRemember}
              className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-semibold text-black"
            >
              Remember
            </button>

            <button
              type="button"
              onClick={onForget}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {display.actionLabel && (
        <button
          type="button"
          onClick={onPrimaryAction}
          className="w-full rounded-xl bg-white px-4 py-3 font-display text-sm font-bold text-black transition hover:opacity-90 active:scale-[0.98]"
        >
          {display.actionLabel}
        </button>
      )}

      <div className="mt-4 text-[11px] text-white/25">
        {display.debug.domain} · {display.debug.verb} ·{" "}
        {display.debug.memoryClass} · {display.debug.actionType}
      </div>
    </div>
  );
}
