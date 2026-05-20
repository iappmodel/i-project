export class WalletInvariantError extends Error {
  readonly code: string;
  readonly reasonCodes: string[];

  constructor(params: { code: string; message: string; reasonCodes?: string[] }) {
    super(params.message);
    this.name = "WalletInvariantError";
    this.code = params.code;
    this.reasonCodes = params.reasonCodes ?? [params.code];
  }
}

export function walletInvariantFail(params: {
  code: string;
  message: string;
  reasonCodes?: string[];
}): never {
  throw new WalletInvariantError(params);
}

export function isWalletInvariantError(error: unknown): error is WalletInvariantError {
  return error instanceof WalletInvariantError;
}
