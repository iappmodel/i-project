export class IdempotencyExpiryError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: { code: string; message: string; reasonCodes?: string[] }) {
    super(params.message);
    this.name = "IdempotencyExpiryError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function idempotencyExpiryFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new IdempotencyExpiryError(params);
}

export function isIdempotencyExpiryError(error: unknown): error is IdempotencyExpiryError {
  return error instanceof IdempotencyExpiryError;
}
