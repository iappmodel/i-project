import type { IMemoryClass } from "./i-command.types";

export function requiresMemoryConsent(parse: { memoryClass: string }): boolean {
  if (!parse || typeof parse.memoryClass === "undefined") return false;
  if (parse.memoryClass === "none") return false;
  if (parse.memoryClass === "temporary") return false;

  return [
    "preference",
    "goal",
    "pattern",
    "sensitive",
    "restricted",
  ].includes(parse.memoryClass);
}

export function memoryConsentCopy(memoryClass: IMemoryClass): string {
  switch (memoryClass) {
    case "preference":
      return "Should i remember this preference for you?";
    case "goal":
      return "Should i remember this goal for you?";
    case "pattern":
      return "Should i remember this pattern to help you better?";
    case "sensitive":
      return "Should i keep this between us?";
    case "restricted":
      return "This is sensitive. i can help now, but saving it requires explicit consent.";
    case "temporary":
    case "none":
    default:
      return "i will use this only for this moment.";
  }
}
