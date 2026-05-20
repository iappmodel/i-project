export class AdminReviewError extends Error {
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
    this.name = "AdminReviewError";
    this.code = params.code;
    this.statusCode = params.statusCode ?? 500;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function adminReviewFail(params: {
  code: string;
  message: string;
  statusCode?: number;
  reasonCodes?: string[];
}): never {
  throw new AdminReviewError(params);
}

export function isAdminReviewError(error: unknown): error is AdminReviewError {
  return error instanceof AdminReviewError;
}
