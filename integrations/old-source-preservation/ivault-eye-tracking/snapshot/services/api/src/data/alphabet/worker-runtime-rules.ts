import type { WorkerRuntimeRuleSet } from "@/types/alphabet/worker-runtime.types";

export const WORKER_RUNTIME_RULES: WorkerRuntimeRuleSet[] = [
  {
    handlerName: "wallet.credit",
    financialHandler: true,
    externalSideEffect: false,
    requiresAudit: true,
    requiresNotification: true,
    requiresIdempotency: true,
    retryAllowed: true,
    maxRetryCount: 3,
    lockTtlSeconds: 60,
    timeoutMs: 30000,
    active: true
  },
  {
    handlerName: "wallet.debit",
    financialHandler: true,
    externalSideEffect: false,
    requiresAudit: true,
    requiresNotification: true,
    requiresIdempotency: true,
    retryAllowed: false,
    maxRetryCount: 1,
    lockTtlSeconds: 60,
    timeoutMs: 30000,
    active: true
  },
  {
    handlerName: "withdrawal.create",
    financialHandler: true,
    externalSideEffect: true,
    requiresAudit: true,
    requiresNotification: true,
    requiresIdempotency: true,
    retryAllowed: false,
    maxRetryCount: 1,
    lockTtlSeconds: 120,
    timeoutMs: 60000,
    active: true
  },
  {
    handlerName: "notification.send",
    financialHandler: false,
    externalSideEffect: false,
    requiresAudit: false,
    requiresNotification: false,
    requiresIdempotency: false,
    retryAllowed: true,
    maxRetryCount: 5,
    lockTtlSeconds: 45,
    timeoutMs: 15000,
    active: true
  },
  {
    handlerName: "audit.create",
    financialHandler: false,
    externalSideEffect: false,
    requiresAudit: false,
    requiresNotification: false,
    requiresIdempotency: false,
    retryAllowed: true,
    maxRetryCount: 3,
    lockTtlSeconds: 45,
    timeoutMs: 15000,
    active: true
  },
  {
    handlerName: "system.noop",
    financialHandler: false,
    externalSideEffect: false,
    requiresAudit: false,
    requiresNotification: false,
    requiresIdempotency: false,
    retryAllowed: true,
    maxRetryCount: 3,
    lockTtlSeconds: 30,
    timeoutMs: 5000,
    active: true
  }
];

export function getWorkerRuntimeRule(handlerName: string): WorkerRuntimeRuleSet | null {
  return WORKER_RUNTIME_RULES.find((rule) => rule.active && rule.handlerName === handlerName) ?? null;
}
