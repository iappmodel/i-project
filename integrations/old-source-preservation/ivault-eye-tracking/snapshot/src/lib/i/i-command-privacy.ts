import type { ICommandDomain, IPrivacyLevel } from "./i-command.types";

export function shouldEnterPrivateMode(parse: { privacyLevel: string }): boolean {
  return (
    parse != null &&
    (parse.privacyLevel === "deep_private" || parse.privacyLevel === "restricted")
  );
}

export function privacyLabel(level: IPrivacyLevel): string {
  switch (level) {
    case "public_safe":
      return "normal";
    case "personal":
      return "personal";
    case "private":
      return "private";
    case "deep_private":
      return "between you and i";
    case "restricted":
      return "safety protected";
    default:
      return "normal";
  }
}

export function domainRequiresIsolation(domain: ICommandDomain): boolean {
  return [
    "private_self",
    "health",
    "finance",
    "relationships",
    "emergency_safety",
  ].includes(domain);
}
