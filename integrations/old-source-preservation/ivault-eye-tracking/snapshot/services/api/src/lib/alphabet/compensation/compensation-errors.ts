export class CompensationError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: { code: string; message: string; reasonCodes?: string[] }) {
    super(params.message);
    this.name = "CompensationError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function compensationFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new CompensationError(params);
}

export function isCompensationError(error: unknown): error is CompensationError {
  return error instanceof CompensationError;
}
