import type { WorkerHandlerContext, WorkerHandlerResult } from "@/types/alphabet/worker-runtime.types";
import { walletCreditHandler } from "./domain-handlers/wallet-credit.handler";
import { walletDebitHandler } from "./domain-handlers/wallet-debit.handler";
import { withdrawalCreateHandler } from "./domain-handlers/withdrawal-create.handler";
import { notificationSendHandler } from "./domain-handlers/notification-send.handler";
import { auditCreateHandler } from "./domain-handlers/audit-create.handler";
import { systemNoopHandler } from "./domain-handlers/system-noop.handler";

export type WorkerDomainHandler = (context: WorkerHandlerContext) => Promise<WorkerHandlerResult>;

const HANDLERS: Record<string, WorkerDomainHandler> = {
  "wallet.credit": walletCreditHandler,
  "wallet.debit": walletDebitHandler,
  "withdrawal.create": withdrawalCreateHandler,
  "notification.send": notificationSendHandler,
  "audit.create": auditCreateHandler,
  "system.noop": systemNoopHandler
};

export function resolveWorkerDomainHandler(handlerName: string): WorkerDomainHandler | null {
  return HANDLERS[handlerName] ?? null;
}
