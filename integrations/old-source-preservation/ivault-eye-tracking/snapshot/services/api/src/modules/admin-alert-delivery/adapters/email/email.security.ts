import { getEmailAlertConfig } from "./email.config";

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

export function getEmailDomain(email: string): string {
  const parts = email.split("@");

  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("invalid email target");
  }

  return parts[1].toLowerCase();
}

export function assertAllowedEmailRecipient(target: string | null): string {
  if (!target) {
    throw new Error("email target is required");
  }

  const config = getEmailAlertConfig();
  const email = normalizeEmailAddress(target);
  const domain = getEmailDomain(email);

  const explicitlyAllowed = config.allowedRecipients.has(email);
  const domainAllowed = config.allowedDomains.has(domain);

  if (!explicitlyAllowed && !domainAllowed) {
    throw new Error("email target is not allowlisted");
  }

  return email;
}
