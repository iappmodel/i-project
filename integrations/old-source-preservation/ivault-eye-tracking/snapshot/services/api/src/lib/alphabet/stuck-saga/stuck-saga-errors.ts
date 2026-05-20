export class StuckSagaError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: {
    code: string;
    message: string;
    reasonCodes?: string[];
  }) {
    super(params.message);
    this.name = "StuckSagaError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function stuckSagaFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new StuckSagaError(params);
}

export function isStuckSagaError(error: unknown): error is StuckSagaError {
  return error instanceof StuckSagaError;
}
