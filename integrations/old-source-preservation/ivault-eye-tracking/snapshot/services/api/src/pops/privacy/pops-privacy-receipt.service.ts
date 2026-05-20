import type { PopsRewardDecision } from "../rewards/pops-reward-decision.types";
import type { TrustEvent } from "../trust/pops-trust.types";
import { buildInternalSummary, buildUserVisibleSummary } from "./pops-privacy-copy";
import { filterStoredRawDataTypes } from "./pops-consent-policy";
import {
  type CreatePopsPrivacyReceiptInput,
  type PopsPrivacyReceipt,
  type PopsPrivacyReceiptRepository
} from "./pops-privacy-receipt.types";
import { retentionExpiresAtForPolicy } from "./pops-retention-policy";
import {
  bundleToPrivacyReceiptVersionFields,
  resolvePopsVersionBundle
} from "../versioning/pops-version-resolver";

function nowIso(): string {
  return new Date().toISOString();
}

export interface PopsPrivacyAttachmentResult {
  rewardDecision: PopsRewardDecision | null;
  trustEvent: TrustEvent | null;
}

export class InMemoryPopsPrivacyReceiptRepository implements PopsPrivacyReceiptRepository {
  private readonly receipts: PopsPrivacyReceipt[] = [];

  async save(receipt: PopsPrivacyReceipt): Promise<void> {
    this.receipts.push(receipt);
  }

  list(): PopsPrivacyReceipt[] {
    return [...this.receipts];
  }
}

export class PopsPrivacyReceiptService {
  constructor(private readonly repository: PopsPrivacyReceiptRepository) {}

  async createPrivacyReceipt(
    input: CreatePopsPrivacyReceiptInput
  ): Promise<{ receipt: PopsPrivacyReceipt; attachments: PopsPrivacyAttachmentResult }> {
    const createdAt = nowIso();
    const rawDataTypesStored = filterStoredRawDataTypes({
      proofLevel: input.session.proofLevel,
      retentionPolicy: input.retentionPolicy,
      requestedRawDataTypes: input.rawDataTypesStored
    });
    const rawDataDiscarded = rawDataTypesStored.length === 0;
    const retentionExpiresAt = retentionExpiresAtForPolicy(input.retentionPolicy, createdAt);

    const md = input.session.metadata ?? {};
    const region = typeof md.region === "string" ? md.region : "GLOBAL";
    const appVersion = typeof md.appVersion === "string" ? md.appVersion : "1.0.0";
    const featureFlags =
      typeof md.featureFlags === "object" && md.featureFlags !== null && !Array.isArray(md.featureFlags)
        ? (md.featureFlags as Record<string, boolean | string | number>)
        : {};
    const bundle = resolvePopsVersionBundle({
      sessionAt: createdAt,
      campaignId: input.session.campaignId,
      region,
      appVersion,
      featureFlags
    });
    const pv = bundleToPrivacyReceiptVersionFields(bundle);

    const receipt: PopsPrivacyReceipt = {
      id: `pops_privacy_receipt_${crypto.randomUUID()}`,
      userId: input.session.userId,
      sessionId: input.session.id,
      sessionType: input.session.sessionType,
      proofLevel: input.session.proofLevel,
      decisionId: input.rewardDecision?.id ?? null,
      signalCategoriesUsed: [...new Set(input.signalCategoriesUsed)],
      rawDataTypesStored,
      storedFeatureTypes: [...new Set(input.storedFeatureTypes)],
      localProcessingUsed: input.localProcessingUsed,
      rawDataDiscarded,
      retentionPolicy: input.retentionPolicy,
      retentionExpiresAt,
      userVisibleSummary: buildUserVisibleSummary({
        sessionType: input.session.sessionType,
        signalCategoriesUsed: input.signalCategoriesUsed,
        rawDataTypesStored,
        judgment: input.judgment,
        rewardDecision: input.rewardDecision
      }),
      internalSummary: buildInternalSummary({
        sessionId: input.session.id,
        sessionType: input.session.sessionType,
        proofLevel: input.session.proofLevel,
        signalCategoriesUsed: input.signalCategoriesUsed,
        rawDataTypesStored,
        localProcessingUsed: input.localProcessingUsed,
        judgment: input.judgment,
        rewardDecision: input.rewardDecision
      }),
      policyVersion: input.policyVersion ?? "pops-privacy-v1",
      privacyPolicyVersion: input.privacyPolicyVersion ?? pv.privacyPolicyVersion,
      retentionPolicyVersion: input.retentionPolicyVersion ?? pv.retentionPolicyVersion,
      consentPolicyVersion: input.consentPolicyVersion ?? pv.consentPolicyVersion,
      createdAt
    };

    await this.repository.save(receipt);

    const attachments = this.attachReceipt(receipt, input.rewardDecision, input.trustEvent ?? null);
    return { receipt, attachments };
  }

  private attachReceipt(
    receipt: PopsPrivacyReceipt,
    rewardDecision: PopsRewardDecision | null,
    trustEvent: TrustEvent | null
  ): PopsPrivacyAttachmentResult {
    const attachedDecision = rewardDecision
      ? { ...rewardDecision, privacyReceiptId: receipt.id }
      : null;
    const attachedTrustEvent = trustEvent ? { ...trustEvent, privacyReceiptId: receipt.id } : null;

    return {
      rewardDecision: attachedDecision,
      trustEvent: attachedTrustEvent
    };
  }
}

