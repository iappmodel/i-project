export class WorkerRuntimeError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly reasonCodes: string[];

  constructor(params: {
    code: string;
    message: string;
    retryable?: boolean;
    reasonCodes?: string[];
  }) {
    super(params.message);
    this.name = "WorkerRuntimeError";
    this.code = params.code;
    this.retryable = params.retryable ?? false;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function workerFail(params: {
  code: string;
  message: string;
  retryable?: boolean;
  reasonCodes?: string[];
}): never {
  throw new WorkerRuntimeError(params);
}

export function isWorkerRuntimeError(error: unknown): error is WorkerRuntimeError {
  return error instanceof WorkerRuntimeError;
}
