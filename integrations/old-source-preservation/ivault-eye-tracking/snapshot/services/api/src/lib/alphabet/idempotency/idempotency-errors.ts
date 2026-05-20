export class IdempotencyError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: { code: string; message: string; reasonCodes?: string[] }) {
    super(params.message);
    this.name = "IdempotencyError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function idempotencyFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new IdempotencyError(params);
}

export function isIdempotencyError(error: unknown): error is IdempotencyError {
  return error instanceof IdempotencyError;
}
