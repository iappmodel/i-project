export class SafeActionExecutionError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: { code: string; message: string; reasonCodes?: string[] }) {
    super(params.message);
    this.name = "SafeActionExecutionError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function safeActionFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new SafeActionExecutionError(params);
}

export function isSafeActionExecutionError(
  error: unknown
): error is SafeActionExecutionError {
  return error instanceof SafeActionExecutionError;
}
