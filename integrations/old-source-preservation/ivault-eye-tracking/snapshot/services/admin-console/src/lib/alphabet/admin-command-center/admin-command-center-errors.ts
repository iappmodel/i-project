export class AdminCommandCenterError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: { code: string; message: string; reasonCodes?: string[] }) {
    super(params.message);
    this.name = "AdminCommandCenterError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function adminCommandCenterFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new AdminCommandCenterError(params);
}

export function isAdminCommandCenterError(error: unknown): error is AdminCommandCenterError {
  return error instanceof AdminCommandCenterError;
}
