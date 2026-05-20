export class TrustFraudReviewError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: { code: string; message: string; reasonCodes?: string[] }) {
    super(params.message);
    this.name = "TrustFraudReviewError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function trustFraudReviewFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new TrustFraudReviewError(params);
}

export function isTrustFraudReviewError(error: unknown): error is TrustFraudReviewError {
  return error instanceof TrustFraudReviewError;
}
