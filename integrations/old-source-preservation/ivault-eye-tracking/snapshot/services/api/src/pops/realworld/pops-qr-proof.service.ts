import type { PopsSignedQrPayload } from "./pops-realworld.types";
import { signPopsRealWorldPayload, verifyPopsRealWorldEnvelope } from "./pops-realworld-signing";

export interface PopsQrNonceStore {
  hasUsed(jti: string): boolean;
  markUsed(jti: string): void;
}

export interface PopsQrProofVerifyInput {
  envelope: string;
  secret: string;
  expectedCampaignId: string;
  expectedMerchantId: string;
  nowMs: number;
  /** Same physical scan presented from another account within tight window → share suspicion. */
  peerScanFingerprint?: string | null;
  lastPeerFingerprint?: string | null;
}

export interface PopsQrProofResult {
  ok: boolean;
  qrScanId: string | null;
  qrProofScore: number;
  qrReuseSuspected: boolean;
  qrShareSuspected: boolean;
  reasons: string[];
}

const MAX_QR_TTL_MS = 5 * 60 * 1000;

/**
 * QR must be signed, expire quickly, and JTIs must be single-use (reuse detection).
 */
export class PopsQrProofService {
  constructor(private readonly nonceStore: PopsQrNonceStore) {}

  createSignedEnvelope(payload: PopsSignedQrPayload, secret: string): string {
    const ttl = payload.expiresAtMs - payload.issuedAtMs;
    if (ttl > MAX_QR_TTL_MS) {
      throw new Error("QR_TTL_EXCEEDS_POLICY_MAX");
    }
    return signPopsRealWorldPayload(JSON.stringify(payload), secret);
  }

  verify(input: PopsQrProofVerifyInput): PopsQrProofResult {
    const reasons: string[] = [];
    const parsed = verifyPopsRealWorldEnvelope<PopsSignedQrPayload>(input.envelope, input.secret);
    if (!parsed.ok) {
      return {
        ok: false,
        qrScanId: null,
        qrProofScore: 0,
        qrReuseSuspected: false,
        qrShareSuspected: false,
        reasons: [parsed.reason],
      };
    }
    const p = parsed.value;
    if (p.campaignId !== input.expectedCampaignId) reasons.push("QR_CAMPAIGN_MISMATCH");
    if (p.merchantId !== input.expectedMerchantId) reasons.push("QR_MERCHANT_MISMATCH");
    if (input.nowMs > p.expiresAtMs) reasons.push("QR_EXPIRED");
    if (input.nowMs < p.issuedAtMs) reasons.push("QR_NOT_YET_VALID");

    const qrReuseSuspected = this.nonceStore.hasUsed(p.jti);
    if (!qrReuseSuspected) {
      this.nonceStore.markUsed(p.jti);
    } else {
      reasons.push("QR_JTI_REUSE");
    }

    let qrShareSuspected = false;
    if (
      input.peerScanFingerprint &&
      input.lastPeerFingerprint &&
      input.peerScanFingerprint === input.lastPeerFingerprint
    ) {
      qrShareSuspected = true;
      reasons.push("QR_PEER_FINGERPRINT_COLLISION");
    }

    const structuralOk =
      p.campaignId === input.expectedCampaignId &&
      p.merchantId === input.expectedMerchantId &&
      input.nowMs <= p.expiresAtMs &&
      input.nowMs >= p.issuedAtMs;

    const ok = structuralOk && !qrReuseSuspected;
    const qrProofScore = ok ? (qrShareSuspected ? 0.55 : 0.95) : structuralOk ? 0.25 : 0;

    return {
      ok,
      qrScanId: p.qrScanId,
      qrProofScore,
      qrReuseSuspected,
      qrShareSuspected,
      reasons,
    };
  }
}

export class InMemoryPopsQrNonceStore implements PopsQrNonceStore {
  private readonly used = new Set<string>();
  hasUsed(jti: string): boolean {
    return this.used.has(jti);
  }
  markUsed(jti: string): void {
    this.used.add(jti);
  }
}
