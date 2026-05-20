export class AlphabetRuntimeError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly reasonCodes: string[];

  constructor(params: {
    code: string;
    message: string;
    statusCode?: number;
    reasonCodes?: string[];
  }) {
    super(params.message);
    this.name = "AlphabetRuntimeError";
    this.code = params.code;
    this.statusCode = params.statusCode ?? 500;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function failClosed(params: {
  code: string;
  message: string;
  statusCode?: number;
  reasonCodes?: string[];
}): never {
  throw new AlphabetRuntimeError(params);
}

export function isAlphabetRuntimeError(error: unknown): error is AlphabetRuntimeError {
  return error instanceof AlphabetRuntimeError;
}
