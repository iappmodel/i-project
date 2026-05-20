export class ProviderReconciliationError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: { code: string; message: string; reasonCodes?: string[] }) {
    super(params.message);
    this.name = "ProviderReconciliationError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function providerReconciliationFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new ProviderReconciliationError(params);
}

export function isProviderReconciliationError(
  error: unknown
): error is ProviderReconciliationError {
  return error instanceof ProviderReconciliationError;
}
