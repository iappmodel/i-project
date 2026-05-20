export class FinancialReconciliationError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: { code: string; message: string; reasonCodes?: string[] }) {
    super(params.message);
    this.name = "FinancialReconciliationError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function financialReconciliationFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new FinancialReconciliationError(params);
}

export function isFinancialReconciliationError(
  error: unknown
): error is FinancialReconciliationError {
  return error instanceof FinancialReconciliationError;
}
