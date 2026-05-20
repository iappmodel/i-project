export class AdminReviewHookError extends Error {
  readonly code: string;
  readonly failClosed: boolean;
  readonly reasonCodes: string[];

  constructor(params: {
    code: string;
    message: string;
    failClosed?: boolean;
    reasonCodes?: string[];
  }) {
    super(params.message);
    this.name = "AdminReviewHookError";
    this.code = params.code;
    this.failClosed = params.failClosed ?? false;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function adminReviewHookFail(params: {
  code: string;
  message: string;
  failClosed?: boolean;
  reasonCodes?: string[];
}): never {
  throw new AdminReviewHookError(params);
}

export function isAdminReviewHookError(error: unknown): error is AdminReviewHookError {
  return error instanceof AdminReviewHookError;
}
