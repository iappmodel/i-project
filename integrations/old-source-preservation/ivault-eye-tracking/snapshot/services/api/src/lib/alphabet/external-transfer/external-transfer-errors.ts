export class ExternalTransferError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: { code: string; message: string; reasonCodes?: string[] }) {
    super(params.message);
    this.name = "ExternalTransferError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function externalTransferFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new ExternalTransferError(params);
}

export function isExternalTransferError(error: unknown): error is ExternalTransferError {
  return error instanceof ExternalTransferError;
}
