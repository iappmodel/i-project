export class ScheduledJobError extends Error {
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
    this.name = "ScheduledJobError";
    this.code = params.code;
    this.retryable = params.retryable ?? false;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function scheduledJobFail(params: {
  code: string;
  message: string;
  retryable?: boolean;
  reasonCodes?: string[];
}): never {
  throw new ScheduledJobError(params);
}

export function isScheduledJobError(error: unknown): error is ScheduledJobError {
  return error instanceof ScheduledJobError;
}
