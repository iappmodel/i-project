import type { PopsSignedNfcPayload } from "./pops-realworld.types";
import { signPopsRealWorldPayload, verifyPopsRealWorldEnvelope } from "./pops-realworld-signing";

export interface PopsNfcOneTimeStore {
  hasConsumed(sessionToken: string): boolean;
  markConsumed(sessionToken: string): void;
}

export interface PopsNfcProofVerifyInput {
  envelope: string;
  secret: string;
  expectedMerchantId: string;
  expectedDeviceBindingId: string;
  nowMs: number;
}

export interface PopsNfcProofResult {
  ok: boolean;
  nfcTapId: string | null;
  nfcProofScore: number;
  reasons: string[];
}

/**
 * NFC tap: signed token, one-time session token, merchant + device binding.
 */
export class PopsNfcProofService {
  constructor(private readonly oneTime: PopsNfcOneTimeStore) {}

  createSignedEnvelope(payload: PopsSignedNfcPayload, secret: string): string {
    return signPopsRealWorldPayload(JSON.stringify(payload), secret);
  }

  verify(input: PopsNfcProofVerifyInput): PopsNfcProofResult {
    const reasons: string[] = [];
    const parsed = verifyPopsRealWorldEnvelope<PopsSignedNfcPayload>(input.envelope, input.secret);
    if (!parsed.ok) {
      return { ok: false, nfcTapId: null, nfcProofScore: 0, reasons: [parsed.reason] };
    }
    const p = parsed.value;
    if (p.merchantId !== input.expectedMerchantId) reasons.push("NFC_MERCHANT_MISMATCH");
    if (p.deviceBindingId !== input.expectedDeviceBindingId) reasons.push("NFC_DEVICE_BINDING_MISMATCH");
    if (input.nowMs > p.expiresAtMs) reasons.push("NFC_EXPIRED");

    const reused = this.oneTime.hasConsumed(p.sessionToken);
    if (reused) {
      reasons.push("NFC_SESSION_TOKEN_REUSE");
    } else {
      this.oneTime.markConsumed(p.sessionToken);
    }

    const structuralOk =
      p.merchantId === input.expectedMerchantId &&
      p.deviceBindingId === input.expectedDeviceBindingId &&
      input.nowMs <= p.expiresAtMs &&
      !reused;

    return {
      ok: structuralOk,
      nfcTapId: p.nfcTapId,
      nfcProofScore: structuralOk ? 0.96 : 0.2,
      reasons,
    };
  }
}

export class InMemoryPopsNfcOneTimeStore implements PopsNfcOneTimeStore {
  private readonly consumed = new Set<string>();
  hasConsumed(sessionToken: string): boolean {
    return this.consumed.has(sessionToken);
  }
  markConsumed(sessionToken: string): void {
    this.consumed.add(sessionToken);
  }
}
