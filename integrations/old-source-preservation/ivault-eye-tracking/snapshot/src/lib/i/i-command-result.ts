import { privacyLabel } from "./i-command-privacy";
import type { ICommandEngineResult } from "./i-command.types";

export interface ICommandDisplayResult {
  title: string;
  message: string;
  actionLabel?: string;
  privacyLabel: string;
  debug: {
    isICommand: boolean;
    verb: string;
    domain: string;
    privacyLevel: string;
    memoryClass: string;
    actionType: string;
    uxState: string;
    confidence: number;
  };
  flags: {
    requiresConfirmation: boolean;
    requiresMemoryConsent: boolean;
    isPrivate: boolean;
    isBlocked: boolean;
    isSafety: boolean;
  };
}

export function toICommandDisplayResult(
  result: ICommandEngineResult,
): ICommandDisplayResult {
  const { parse, route } = result;

  const isPrivate =
    parse.privacyLevel === "private" ||
    parse.privacyLevel === "deep_private" ||
    parse.privacyLevel === "restricted";

  return {
    title: route.title,
    message: route.message,
    actionLabel: route.suggestedActionLabel,
    privacyLabel: privacyLabel(parse.privacyLevel),
    debug: {
      isICommand: parse.isICommand,
      verb: parse.verb,
      domain: parse.domain,
      privacyLevel: parse.privacyLevel,
      memoryClass: parse.memoryClass,
      actionType: route.actionType,
      uxState: route.uxState,
      confidence: parse.confidence,
    },
    flags: {
      requiresConfirmation: route.requiresConfirmation,
      requiresMemoryConsent: route.requiresMemoryConsent,
      isPrivate,
      isBlocked: route.uxState === "blocked",
      isSafety: route.actionType === "safety_escalation",
    },
  };
}
