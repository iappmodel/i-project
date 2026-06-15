# INVENTION_034 — Evidence Vault with Consent-Scoped Storage

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Platform Modules & Identity
**Date:** 2026-06-15

## Problem Solved

Attention verification systems that process biometric-adjacent signals (eye tracking, face detection, camera presence) must store evidence for dispute resolution and legal compliance, but they also face strict privacy requirements around biometric data storage. Existing systems either store all verification evidence without user consent granularity (violating privacy laws like BIPA/GDPR) or store nothing (making dispute resolution impossible). There is no existing system that gates evidence storage through per-scope consent checks, allowing users to control what verification evidence is retained while maintaining a legally admissible custody chain.

## Current Industry Approach

Cloud storage services (AWS S3, Google Cloud Storage) provide object storage with IAM policies but no consent-aware gating. HIPAA-compliant storage (AWS HealthLake) manages health data consent but not attention verification evidence. Identity providers (Auth0, Okta) manage authentication consent but not per-scope biometric evidence storage. GDPR consent management platforms (OneTrust, CookieBot) track website consent preferences but do not gate backend evidence storage operations. No existing system provides consent-scoped storage specifically for attention verification evidence with privacy violation error enforcement.

## How [ i ] Solves It

The [ i ] Evidence Vault implements a consent-scoped private storage system that gates all evidence retention behind explicit user consent. The `ConsentVaultRepository` interface defines three operations: `upsertVaultSettings` (enable/disable vault), `upsertConsent` (grant/revoke per-scope consent), and `hasConsent` (check consent for a scope). The `ConsentScope` enum defines granular scopes — critically `ConsentScope.PrivateVaultStorage` gates whether any private evidence may be stored at all. Before any evidence is written to the vault, the system calls `assertOptionalPrivateStorageAllowed` which checks the user's consent for the `PrivateVaultStorage` scope and throws a `PrivacyViolationError` with machine-readable context (`["consent_scope:PRIVATE_VAULT_STORAGE"]`) if consent is not active. This creates a hard enforcement boundary: no code path can store private verification evidence without active consent. The admin legal custody vault (migrations 204-209) provides a parallel, consent-independent storage path for legally required evidence retention (court orders, regulatory holds), ensuring the platform can meet legal obligations even when user consent for private storage is revoked.

## System Description

The consent vault architecture has three layers. The **consent management layer** (`consentVault.ts`) provides high-level operations: `enableUserPrivateStorage` grants `PrivateVaultStorage` consent and enables vault settings in a single atomic operation; `disableUserPrivateStorage` revokes consent and disables settings. These operations always update both the consent record and the vault settings together, preventing inconsistent state. The **assertion layer** (`assertOptionalPrivateStorageAllowed`) is the enforcement boundary: any code path attempting to write private evidence calls this function first, and a `PrivacyViolationError` is thrown if consent is missing. The error includes structured context strings (`consent_scope:PRIVATE_VAULT_STORAGE`) for machine-parseable privacy audit trails. The **repository interface** (`ConsentVaultRepository`) defines the storage abstraction: `upsertConsent(userId, scope, granted)` records consent decisions, `hasConsent(userId, scope)` checks current consent status, and `upsertVaultSettings(userId, enabled)` manages vault activation state. This interface is implemented against the database with per-user consent records and vault settings rows. The admin legal custody vault operates independently through database migrations (204-209) that create admin-accessible evidence tables with legal retention policies, chain-of-custody metadata, and access logging. This separation ensures that user-revocable consent controls their private vault without affecting legally mandated evidence retention. The consent scope system is extensible — new scopes can be added for different categories of evidence (e.g., location evidence, biometric evidence, communication evidence) with independent consent tracking per scope.

## Technical Components

- `consentVault.ts` — High-level consent vault operations (enable, disable, assert)
- `ConsentScope` enum — Granular consent scopes (PrivateVaultStorage, etc.)
- `ConsentVaultRepository` interface — Storage abstraction for consent and vault settings
- `PrivacyViolationError` — Typed error with machine-readable consent scope context
- `enableUserPrivateStorage()` — Atomic consent grant + vault enable
- `disableUserPrivateStorage()` — Atomic consent revoke + vault disable
- `assertOptionalPrivateStorageAllowed()` — Hard enforcement boundary for private storage
- `types.ts` — ConsentScope type definitions
- `errors.ts` — PrivacyViolationError class definition
- Admin legal custody evidence tables (migrations 204-209)
- Per-user consent records — Database rows tracking consent decisions per scope
- Vault settings rows — Database rows tracking vault enable/disable state per user
- Access logging — Audit trail for vault read/write operations

## Data Flow

1. User is prompted to enable private evidence storage during onboarding or settings.
2. `enableUserPrivateStorage(repository, userId)` grants `PrivateVaultStorage` consent and enables vault settings atomically.
3. During attention verification sessions, the system generates evidence artifacts (gaze summaries, verification proofs, session metadata).
4. Before writing any evidence to the vault, code calls `assertOptionalPrivateStorageAllowed(repository, userId)`.
5. If consent is active: evidence is stored in the user's private vault with appropriate encryption and access controls.
6. If consent is not active: `PrivacyViolationError` is thrown with `["consent_scope:PRIVATE_VAULT_STORAGE"]` context; evidence is not stored.
7. User can revoke consent at any time via `disableUserPrivateStorage(repository, userId)`.
8. Upon revocation: vault settings are disabled, future evidence storage is blocked, and existing evidence enters a retention/deletion policy workflow.
9. Admin legal custody path (independent): legally required evidence is stored in admin vault tables per migrations 204-209, with chain-of-custody metadata and access logging.
10. Privacy audit trail records all consent changes, storage assertions, and vault access events.

## User Flow

During onboarding, the user sees an option to enable their "Evidence Vault" — a private storage space for their attention verification evidence. The explanation states that this evidence can help resolve disputes about earnings and verify their attention history. The user enables it. During their attention sessions, verification evidence (session summaries, proof digests, not raw biometric data) is stored in their vault. Later, a reward dispute arises — the user can reference their vault evidence to support their claim. If the user decides to disable the vault in settings, `disableUserPrivateStorage` immediately revokes consent and blocks future storage. The system informs them that existing evidence will be handled per the retention policy. At no point is evidence stored without active consent — the `assertOptionalPrivateStorageAllowed` enforcement boundary guarantees this.

## Economic Flow

The evidence vault creates economic value for all parties. For users: stored evidence supports earnings dispute resolution, increasing trust in the platform and willingness to engage. For the platform: evidence reduces dispute resolution costs by providing machine-verifiable proof of attention sessions. For advertisers: evidence provides auditable verification records demonstrating that attention proofs correspond to genuine sessions. The consent-scoped model reduces legal liability — the platform can demonstrate that evidence storage only occurred with explicit user consent, reducing BIPA/GDPR litigation risk. The admin legal custody vault ensures the platform can meet legal discovery obligations without depending on user consent.

## Fraud Prevention

- `assertOptionalPrivateStorageAllowed` creates a hard enforcement boundary — code cannot bypass consent checks without throwing an error.
- `PrivacyViolationError` includes machine-readable context strings, enabling automated privacy compliance monitoring and alerting.
- Atomic consent + settings operations prevent inconsistent state where consent is granted but settings are disabled (or vice versa).
- Admin legal custody vault is separate from user-controlled vault, preventing users from destroying legally required evidence by revoking consent.
- Access logging on vault operations creates an audit trail for forensic investigation of unauthorized access.
- Consent records are append-only (via upsert), maintaining a complete history of consent decisions for compliance auditing.

## Unique Elements

1. Consent-scoped storage gating where each category of evidence requires independent consent checks before any storage operation, enforced through a typed error boundary (`PrivacyViolationError`).
2. Dual vault architecture: user-controlled private vault gated by `ConsentScope.PrivateVaultStorage` consent, and admin legal custody vault operating independently for legally mandated retention.
3. Atomic consent operations (`enableUserPrivateStorage`, `disableUserPrivateStorage`) that synchronize consent records and vault settings in a single transaction, preventing inconsistent state.
4. Machine-readable privacy violation context (`["consent_scope:PRIVATE_VAULT_STORAGE"]`) on consent assertion failures, enabling automated compliance monitoring.
5. Extensible consent scope system allowing independent consent tracking per evidence category with the same enforcement boundary pattern.

## Potential Patent Claims

1. A method for consent-gated evidence storage in an attention verification system comprising: maintaining per-user consent records for granular storage scopes; asserting active consent before each evidence storage operation; throwing a typed privacy violation error with machine-readable context when consent is missing; and providing an independent admin legal custody storage path for legally mandated evidence retention.
2. A system for consent-scoped attention evidence management comprising: a consent vault repository with consent upsert, consent check, and vault settings operations; an assertion function that enforces consent requirements as a hard boundary for evidence storage code paths; atomic enable/disable operations that synchronize consent and settings state; and a dual-vault architecture separating user-controlled and legally-mandated evidence storage.
3. A method for biometric-adjacent evidence storage with privacy compliance comprising: defining granular consent scopes for different categories of verification evidence; requiring explicit user consent per scope before storing evidence; enabling users to revoke consent with immediate effect on future storage operations; maintaining legally mandated evidence in a separate custody vault independent of user consent; and generating machine-readable audit trails for all consent decisions and storage operations.
4. A privacy enforcement boundary for attention economy evidence comprising: a typed error class carrying consent scope identifiers; an assertion function callable from any code path that gates evidence storage on active consent; atomic consent management operations preventing inconsistent consent/settings state; and separation of user-controlled and regulatory evidence retention paths.

## Potential Competitors

- OneTrust / CookieBot (web consent management, not evidence vault gating)
- AWS HealthLake (health data consent, not attention evidence)
- Auth0 (authentication consent, not evidence storage)
- Apple HealthKit (health data consent, not verification evidence)
- Palantir (evidence management, no consumer consent gating)

## Related Files

- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/backend/privacy/consentVault.ts`
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/backend/privacy/types.ts`
- `integrations/old-source-preservation/ivault-eye-tracking/snapshot/backend/privacy/errors.ts`
- Database migrations 204-209 (admin legal custody vault)

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 8 |
| Patentability | 8 |
| Business Value | 7 |
