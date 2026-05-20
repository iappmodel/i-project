import type {
  ICommandEvent,
  ICommandParseResult,
  ICommandRouteResult,
} from "./i-command.types";

export function createICommandEvent(input: {
  userId: string;
  parse: ICommandParseResult;
  route: ICommandRouteResult;
}): ICommandEvent {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    userId: input.userId,
    raw: input.parse.raw,
    verb: input.parse.verb,
    domain: input.parse.domain,
    privacyLevel: input.parse.privacyLevel,
    memoryClass: input.parse.memoryClass,
    actionType: input.route.actionType,
    safetyFlags: input.parse.safetyFlags,
    confidence: input.parse.confidence,
    createdAt: new Date().toISOString(),
  };
}
