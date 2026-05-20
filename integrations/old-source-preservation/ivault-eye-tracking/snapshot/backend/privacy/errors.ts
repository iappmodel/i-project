export class PrivacyViolationError extends Error {
  readonly code = "PRIVACY_VIOLATION";
  readonly blockedFields: string[];

  constructor(message: string, blockedFields: string[]) {
    super(message);
    this.name = "PrivacyViolationError";
    this.blockedFields = blockedFields;
  }
}
