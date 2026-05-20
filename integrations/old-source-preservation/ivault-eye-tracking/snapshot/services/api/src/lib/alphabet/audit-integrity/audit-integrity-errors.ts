export class AuditIntegrityError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AuditIntegrityError";
    this.code = code;
  }
}

export function isAuditIntegrityError(err: unknown): err is AuditIntegrityError {
  return err instanceof AuditIntegrityError;
}
