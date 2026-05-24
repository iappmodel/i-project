import type { WalletCreditRecord } from "./wallet-credit.js";

export interface WalletCreditStore {
  save(credit: WalletCreditRecord): WalletCreditRecord;
  getBySourceRef(sourceRef: string): WalletCreditRecord | null;
  listByOwnerRef(walletOwnerRef: string): WalletCreditRecord[];
}

export class WalletCreditConflictError extends Error {
  readonly sourceRef: string;

  constructor(sourceRef: string) {
    super(`Wallet credit already exists for sourceRef: ${sourceRef}`);
    this.name = "WalletCreditConflictError";
    this.sourceRef = sourceRef;
  }
}

export class InMemoryWalletCreditStore implements WalletCreditStore {
  private readonly bySourceRef = new Map<string, WalletCreditRecord>();
  private readonly byOwnerRef = new Map<string, WalletCreditRecord[]>();

  save(credit: WalletCreditRecord): WalletCreditRecord {
    if (this.bySourceRef.has(credit.sourceRef)) {
      throw new WalletCreditConflictError(credit.sourceRef);
    }

    this.bySourceRef.set(credit.sourceRef, credit);

    const ownerCredits = this.byOwnerRef.get(credit.walletOwnerRef) ?? [];
    ownerCredits.push(credit);
    this.byOwnerRef.set(credit.walletOwnerRef, ownerCredits);

    return credit;
  }

  getBySourceRef(sourceRef: string): WalletCreditRecord | null {
    return this.bySourceRef.get(sourceRef) ?? null;
  }

  listByOwnerRef(walletOwnerRef: string): WalletCreditRecord[] {
    return [...(this.byOwnerRef.get(walletOwnerRef) ?? [])];
  }

  clear(): void {
    this.bySourceRef.clear();
    this.byOwnerRef.clear();
  }
}
