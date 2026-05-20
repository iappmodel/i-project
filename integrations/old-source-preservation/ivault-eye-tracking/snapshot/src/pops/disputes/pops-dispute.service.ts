import {
  POPS_DISPUTE_STATUS,
  type PopsCreateDisputeInput,
  type PopsDispute,
  type PopsDisputeAbuseSignal,
  type PopsDisputeCorrectionEvent,
  type PopsDisputeEvent,
  type PopsDisputeRateLimitConfig,
  type PopsDisputeStatus,
  type PopsResolveDisputeInput
} from "./pops-dispute.types";

interface PopsDisputeServiceConfig {
  rateLimit?: PopsDisputeRateLimitConfig;
}

interface AdminStatusHookPayload {
  dispute: PopsDispute;
  previousStatus: PopsDisputeStatus;
  newStatus: PopsDisputeStatus;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function isResolvedStatus(status: PopsDisputeStatus): boolean {
  return (
    status === POPS_DISPUTE_STATUS.APPROVED ||
    status === POPS_DISPUTE_STATUS.PARTIALLY_APPROVED ||
    status === POPS_DISPUTE_STATUS.DENIED ||
    status === POPS_DISPUTE_STATUS.CLOSED
  );
}

export class PopsDisputeService {
  private readonly disputes = new Map<string, PopsDispute>();
  private readonly events = new Map<string, PopsDisputeEvent[]>();
  private readonly rateLimitWindowByUser = new Map<string, string[]>();
  private readonly abuseSignalsByUser = new Map<string, PopsDisputeAbuseSignal[]>();
  private readonly correctionEventsByUser = new Map<string, PopsDisputeCorrectionEvent[]>();
  private readonly adminStatusHooks = new Set<(payload: AdminStatusHookPayload) => void>();

  private readonly rateLimit: PopsDisputeRateLimitConfig;

  constructor(config: PopsDisputeServiceConfig = {}) {
    this.rateLimit = config.rateLimit ?? {
      maxDisputesPerWindow: 5,
      windowMs: 24 * 60 * 60 * 1000
    };
  }

  createDispute(input: PopsCreateDisputeInput): PopsDispute {
    this.assertRateLimit(input.userId);
    this.assertNoOpenDisputeForDecision(input.userId, input.rewardDecisionId);

    const createdAt = nowIso();
    const dispute: PopsDispute = {
      id: createId("pops_dispute"),
      userId: input.userId,
      sessionId: input.sessionId,
      rewardDecisionId: input.rewardDecisionId,
      walletRewardIntentId: input.walletRewardIntentId ?? null,
      status: POPS_DISPUTE_STATUS.CREATED,
      reason: input.reason,
      userMessage: input.userMessage.trim(),
      evidenceAttachments: input.evidenceAttachments ?? [],
      adminDecision: null,
      adminNote: null,
      createdAt,
      resolvedAt: null
    };

    this.disputes.set(dispute.id, dispute);
    this.trackDisputeWindowEntry(input.userId, createdAt);
    this.appendEvent(dispute.id, {
      status: POPS_DISPUTE_STATUS.CREATED,
      actorType: "USER",
      actorId: input.userId,
      note: "Dispute created by user."
    });
    return dispute;
  }

  transitionToUnderReview(disputeId: string, adminId: string, note?: string): PopsDispute {
    return this.updateStatus(disputeId, POPS_DISPUTE_STATUS.UNDER_REVIEW, {
      actorType: "ADMIN",
      actorId: adminId,
      note: note ?? "Dispute moved to review."
    });
  }

  resolveDispute(input: PopsResolveDisputeInput): PopsDispute {
    const dispute = this.getDisputeOrThrow(input.disputeId);
    const nextStatus = input.status;
    const updated = this.updateStatus(dispute.id, nextStatus, {
      actorType: "ADMIN",
      actorId: input.adminId,
      note: input.adminNote ?? input.adminDecision
    });

    updated.adminDecision = input.adminDecision;
    updated.adminNote = input.adminNote ?? null;
    if (isResolvedStatus(nextStatus) && !updated.resolvedAt) {
      updated.resolvedAt = nowIso();
    }

    if (nextStatus === POPS_DISPUTE_STATUS.APPROVED || nextStatus === POPS_DISPUTE_STATUS.PARTIALLY_APPROVED) {
      this.recordCorrectionEvent(updated);
    }

    if (nextStatus === POPS_DISPUTE_STATUS.DENIED) {
      this.evaluateDeniedPattern(updated.userId);
    }

    this.disputes.set(updated.id, updated);
    return updated;
  }

  listDisputesForUser(userId: string): PopsDispute[] {
    return [...this.disputes.values()]
      .filter((dispute) => dispute.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  listEvents(disputeId: string): PopsDisputeEvent[] {
    return this.events.get(disputeId) ?? [];
  }

  listAbuseSignals(userId: string): PopsDisputeAbuseSignal[] {
    return this.abuseSignalsByUser.get(userId) ?? [];
  }

  listCorrectionEvents(userId: string): PopsDisputeCorrectionEvent[] {
    return this.correctionEventsByUser.get(userId) ?? [];
  }

  registerAdminStatusHook(hook: (payload: AdminStatusHookPayload) => void): () => void {
    this.adminStatusHooks.add(hook);
    return () => {
      this.adminStatusHooks.delete(hook);
    };
  }

  private updateStatus(
    disputeId: string,
    status: PopsDisputeStatus,
    event: Omit<PopsDisputeEvent, "id" | "disputeId" | "createdAt">
  ): PopsDispute {
    const dispute = this.getDisputeOrThrow(disputeId);
    const previousStatus = dispute.status;
    const updated: PopsDispute = {
      ...dispute,
      status
    };
    this.disputes.set(updated.id, updated);

    this.appendEvent(updated.id, event);
    for (const hook of this.adminStatusHooks) {
      hook({
        dispute: updated,
        previousStatus,
        newStatus: status
      });
    }
    return updated;
  }

  private appendEvent(
    disputeId: string,
    event: Omit<PopsDisputeEvent, "id" | "disputeId" | "createdAt">
  ): PopsDisputeEvent {
    const createdEvent: PopsDisputeEvent = {
      id: createId("pops_dispute_event"),
      disputeId,
      createdAt: nowIso(),
      ...event
    };
    const existing = this.events.get(disputeId) ?? [];
    existing.push(createdEvent);
    this.events.set(disputeId, existing);
    return createdEvent;
  }

  private assertRateLimit(userId: string): void {
    const now = Date.now();
    const existing = this.rateLimitWindowByUser.get(userId) ?? [];
    const kept = existing.filter((iso) => now - new Date(iso).getTime() <= this.rateLimit.windowMs);
    this.rateLimitWindowByUser.set(userId, kept);
    if (kept.length >= this.rateLimit.maxDisputesPerWindow) {
      throw new Error("Rate limit exceeded for disputes. Try again later.");
    }
  }

  private trackDisputeWindowEntry(userId: string, createdAt: string): void {
    const existing = this.rateLimitWindowByUser.get(userId) ?? [];
    existing.push(createdAt);
    this.rateLimitWindowByUser.set(userId, existing);
  }

  private assertNoOpenDisputeForDecision(userId: string, rewardDecisionId: string): void {
    const duplicate = [...this.disputes.values()].find(
      (dispute) =>
        dispute.userId === userId &&
        dispute.rewardDecisionId === rewardDecisionId &&
        !isResolvedStatus(dispute.status)
    );
    if (duplicate) {
      throw new Error("An open dispute already exists for this reward decision.");
    }
  }

  private evaluateDeniedPattern(userId: string): void {
    const deniedInWindow = this.listDisputesForUser(userId).filter((dispute) => {
      if (dispute.status !== POPS_DISPUTE_STATUS.DENIED) return false;
      return Date.now() - new Date(dispute.createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000;
    });

    if (deniedInWindow.length < 3) return;
    const signal: PopsDisputeAbuseSignal = {
      userId,
      disputeId: deniedInWindow[0].id,
      signal: deniedInWindow.length >= 5 ? "DISPUTE_ABUSE_CONFIRMED" : "DISPUTE_ABUSE_WARNING",
      detail:
        deniedInWindow.length >= 5
          ? "Repeated denied disputes indicate abusive pattern; trust impact can apply."
          : "Multiple denied disputes detected; monitor for abuse.",
      createdAt: nowIso()
    };
    const existing = this.abuseSignalsByUser.get(userId) ?? [];
    existing.push(signal);
    this.abuseSignalsByUser.set(userId, existing);
  }

  private recordCorrectionEvent(dispute: PopsDispute): void {
    const event: PopsDisputeCorrectionEvent = {
      userId: dispute.userId,
      disputeId: dispute.id,
      rewardDecisionId: dispute.rewardDecisionId,
      eventType: "REWARD_DECISION_CORRECTED",
      message: "Dispute approved and reward decision corrected.",
      createdAt: nowIso()
    };
    const existing = this.correctionEventsByUser.get(dispute.userId) ?? [];
    existing.push(event);
    this.correctionEventsByUser.set(dispute.userId, existing);
  }

  private getDisputeOrThrow(disputeId: string): PopsDispute {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) {
      throw new Error(`Dispute not found: ${disputeId}`);
    }
    return dispute;
  }
}
