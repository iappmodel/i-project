import { ConsentScope } from "./types";
import { PrivacyViolationError } from "./errors";

export interface ConsentVaultRepository {
  upsertVaultSettings(userId: string, enabled: boolean): Promise<void>;
  upsertConsent(userId: string, scope: ConsentScope, granted: boolean): Promise<void>;
  hasConsent(userId: string, scope: ConsentScope): Promise<boolean>;
}

export async function enableUserPrivateStorage(
  repository: ConsentVaultRepository,
  userId: string,
): Promise<void> {
  await repository.upsertConsent(userId, ConsentScope.PrivateVaultStorage, true);
  await repository.upsertVaultSettings(userId, true);
}

export async function disableUserPrivateStorage(
  repository: ConsentVaultRepository,
  userId: string,
): Promise<void> {
  await repository.upsertConsent(userId, ConsentScope.PrivateVaultStorage, false);
  await repository.upsertVaultSettings(userId, false);
}

export async function assertOptionalPrivateStorageAllowed(
  repository: ConsentVaultRepository,
  userId: string,
): Promise<void> {
  const allowed = await repository.hasConsent(userId, ConsentScope.PrivateVaultStorage);
  if (!allowed) {
    throw new PrivacyViolationError(
      "Private intelligence storage is disabled because consent is not active.",
      ["consent_scope:PRIVATE_VAULT_STORAGE"],
    );
  }
}
