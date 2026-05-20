export class OperationalAlertError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: { code: string; message: string; reasonCodes?: string[] }) {
    super(params.message);
    this.name = "OperationalAlertError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function operationalAlertFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new OperationalAlertError(params);
}

export function isOperationalAlertError(error: unknown): error is OperationalAlertError {
  return error instanceof OperationalAlertError;
}
