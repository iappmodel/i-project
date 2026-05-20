// [ i ] Step 3 — Backend schema registry v0.1 (durable-store contract).
//
// Purpose: name the **logical tables / collections** that back the pipeline:
//   track attention → verify → reserve budget → issue reward → value lot →
//   wallet ledger → trust → fraud → withdrawal / conversion.
//
// **Money invariant (normative):** no column stores a “loose” spendable balance
// that workers PATCH arbitrarily. Economic truth is:
//   • append-only `wallet_ledger_entry` rows ([LedgerEntryV01]),
//   • `wallet_value_lot` rows whose bucket fields change **only** through
//     ledger application / sealed state machines ([ValueLotV01]),
//   • optional `wallet_balance_projection` **derived** snapshots for reads.
//
// Wire DTOs and event payloads live in [build_spec_v01.dart]; this file only
// names persistence boundaries and mutability rules for backend implementers.

/// Product domains backed by durable storage (Step 3 catalog).
enum BackendSchemaDomainV01 {
  identity,
  device,
  attention,
  presence,
  campaign,
  budget,
  reward,
  wallet,
  trust,
  fraud,
  withdrawal,
  conversion,
  admin,
  policy,
  eventLog,
}

extension BackendSchemaDomainV01Wire on BackendSchemaDomainV01 {
  /// Stable snake_case domain segment (URLs, metrics, folder names).
  String get wireSegment => switch (this) {
        BackendSchemaDomainV01.eventLog => 'event_log',
        _ => name,
      };
}

/// How rows in a collection may change over time (enforcement hint for DB/ORM).
enum BackendSchemaMutabilityV01 {
  /// Insert-only; corrections are new rows (compensating entries / new events).
  appendOnly,

  /// Recomputed from append-only sources (e.g. balance projection, trust snapshot).
  derivedSnapshot,

  /// Updates allowed only via named transitions (e.g. lot buckets + ledger in one txn).
  controlledTransition,

  /// Rare static or versioned config (e.g. campaign text); not an accounting surface.
  referenceData,
}

/// One logical backend collection / table.
final class BackendTableDescriptorV01 {
  const BackendTableDescriptorV01({
    required this.domain,
    required this.collectionName,
    required this.mutability,
    required this.moneyAdjacent,
    required this.primaryKey,
    required this.buildSpecTypes,
    required this.notes,
  });

  final BackendSchemaDomainV01 domain;

  /// Table or collection name (snake_case). Map 1:1 in SQL; use as collection id in doc DBs.
  final String collectionName;
  final BackendSchemaMutabilityV01 mutability;

  /// True if incorrect writes can move value or break reservation invariants.
  final bool moneyAdjacent;
  final String primaryKey;

  /// Primary [build_spec_v01.dart] types or event families stored in this collection.
  final List<String> buildSpecTypes;
  final String notes;
}

/// Canonical registry: every domain from Step 3 has at least one collection.
abstract final class BackendSchemaRegistryV01 {
  /// Ordered catalog (stable for docs and tests).
  static const List<BackendTableDescriptorV01> tables = [
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.identity,
      collectionName: 'identity_user',
      mutability: BackendSchemaMutabilityV01.controlledTransition,
      moneyAdjacent: false,
      primaryKey: 'user_id',
      buildSpecTypes: [
        'IdentityUserCreatedPayloadV01',
        'IdentityUserVerifiedPayloadV01',
        'IdentityUserRestrictedPayloadV01',
        'IdentityUserUnrestrictedPayloadV01',
      ],
      notes: 'Authoritative user row; verification tier and restriction flags — not a wallet.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.device,
      collectionName: 'device_binding',
      mutability: BackendSchemaMutabilityV01.controlledTransition,
      moneyAdjacent: false,
      primaryKey: 'device_id',
      buildSpecTypes: [
        'CanonicalDeviceEventTypesV01.registered',
      ],
      notes: 'Links device fingerprint / install id to user_id; feeds fraud and session integrity.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.attention,
      collectionName: 'attention_session',
      mutability: BackendSchemaMutabilityV01.controlledTransition,
      moneyAdjacent: false,
      primaryKey: 'session_id',
      buildSpecTypes: [
        'AttentionSessionStartedPayloadV01',
        'AttentionSessionCompletedPayloadV01',
        'AttentionSessionAbandonedPayloadV01',
      ],
      notes: 'Client-originated lifecycle only; terminal states set by backend after ingest validation.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.attention,
      collectionName: 'attention_runtime_signal_batch',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: false,
      primaryKey: 'batch_id',
      buildSpecTypes: ['RuntimeSignalsV01', 'ExtendedRuntimeSignalsV01'],
      notes: 'Aggregated or batched runtime_signal.sampled payloads; insert-only.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.attention,
      collectionName: 'attention_verification',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: false,
      primaryKey: 'verification_id',
      buildSpecTypes: ['AttentionVerificationResultV01'],
      notes: 'System-produced verification record; immutable after insert (Rule 22).',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.presence,
      collectionName: 'presence_verification',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: true,
      primaryKey: 'verification_id',
      buildSpecTypes: [
        'PresenceVerificationScored',
      ],
      notes:
          'Multimodal interpreted proof output for a moment; stores confidences, risk, and state (no raw camera/audio/location payloads).',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.presence,
      collectionName: 'presence_decision',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: true,
      primaryKey: 'decision_id',
      buildSpecTypes: [
        'PresenceDecisionProduced',
      ],
      notes:
          'Decision facts (approve/hold/deny/reverify/flag) consumed by reward, trust, and fraud integrations.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.presence,
      collectionName: 'presence_privacy_receipt',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: false,
      primaryKey: 'receipt_id',
      buildSpecTypes: [
        'PresencePrivacyReceipt',
      ],
      notes:
          'User-visible transparency record for money/trust/eligibility-sensitive sessions.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.campaign,
      collectionName: 'campaign',
      mutability: BackendSchemaMutabilityV01.referenceData,
      moneyAdjacent: true,
      primaryKey: 'campaign_id',
      buildSpecTypes: ['CampaignV01'],
      notes: 'Defines reward thresholds and budget_id; status FSM; not a ledger.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.budget,
      collectionName: 'campaign_budget',
      mutability: BackendSchemaMutabilityV01.controlledTransition,
      moneyAdjacent: true,
      primaryKey: 'budget_id',
      buildSpecTypes: ['CampaignBudgetV01'],
      notes:
          'Aggregate counters (reserved/settled/…) updated only with reservation + capture events; AGENTS.md Rule 28 — pair with budget_reservation in one DB transaction.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.budget,
      collectionName: 'budget_reservation',
      mutability: BackendSchemaMutabilityV01.controlledTransition,
      moneyAdjacent: true,
      primaryKey: 'reservation_id',
      buildSpecTypes: [
        'BudgetReservationCreatedPayloadV01',
        'BudgetReservationReleasedPayloadV01',
        'BudgetReservationCapturedPayloadV01',
      ],
      notes:
          'Holds reserved amount against campaign until capture, release, or expiry; pairs with budget.* events. AGENTS.md Rule 28 — create/capture/release with campaign_budget in one transaction.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.reward,
      collectionName: 'reward_candidate',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: true,
      primaryKey: 'candidate_id',
      buildSpecTypes: ['CanonicalRewardEventTypesV01.candidateCreated'],
      notes: 'Intent to pay after verification; idempotent with verification + session keys (§19).',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.reward,
      collectionName: 'reward_decision',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: true,
      primaryKey: 'decision_id',
      buildSpecTypes: [
        'RewardIssuanceDecisionV01',
        'CanonicalRewardEventTypesV01 (approved / rejected / held / released / clawed_back)',
      ],
      notes: 'Sealed outcome; downstream wallet + budget workers consume; never edited in place.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.wallet,
      collectionName: 'wallet_account',
      mutability: BackendSchemaMutabilityV01.referenceData,
      moneyAdjacent: false,
      primaryKey: 'wallet_id',
      buildSpecTypes: [],
      notes: 'Metadata and limits only — **no** authoritative balance column (AGENTS.md Rule 2).',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.wallet,
      collectionName: 'wallet_ledger_entry',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: true,
      primaryKey: 'ledger_entry_id',
      buildSpecTypes: ['LedgerEntryV01'],
      notes: 'Append-only journal; every bucket move on value lots must be explainable via lines here.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.wallet,
      collectionName: 'wallet_value_lot',
      mutability: BackendSchemaMutabilityV01.controlledTransition,
      moneyAdjacent: true,
      primaryKey: 'value_lot_id',
      buildSpecTypes: ['ValueLotV01'],
      notes:
          'Bucket fields change only in the same DB transaction as matching wallet_ledger_entry rows (AGENTS.md Rule 28).',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.wallet,
      collectionName: 'wallet_balance_projection',
      mutability: BackendSchemaMutabilityV01.derivedSnapshot,
      moneyAdjacent: true,
      primaryKey: 'projection_id',
      buildSpecTypes: ['CanonicalWalletEventTypesV01.balanceProjected'],
      notes: 'Read model / cache; rebuild from ledger + lots; safe to delete and recompute.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.trust,
      collectionName: 'trust_state',
      mutability: BackendSchemaMutabilityV01.derivedSnapshot,
      moneyAdjacent: true,
      primaryKey: 'user_id',
      buildSpecTypes: ['TrustStateV01'],
      notes: 'Materialized trust tier + limits; source of truth is append-only trust_signal rows.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.trust,
      collectionName: 'trust_signal',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: false,
      primaryKey: 'trust_event_id',
      buildSpecTypes: ['TrustEventV01', 'CanonicalTrustEventTypesV01'],
      notes: 'Each trust delta or limit change is an immutable fact used to recompute TrustStateV01.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.fraud,
      collectionName: 'risk_decision',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: false,
      primaryKey: 'risk_decision_id',
      buildSpecTypes: ['RiskDecisionV01'],
      notes: 'Machine risk output feeding reward hold / fraud case opening.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.fraud,
      collectionName: 'fraud_flag',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: false,
      primaryKey: 'flag_id',
      buildSpecTypes: ['CanonicalFraudEventTypesV01.flagCreated'],
      notes: 'Rule 8: holds and clawbacks reference flag / case ids for provenance.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.fraud,
      collectionName: 'fraud_case',
      mutability: BackendSchemaMutabilityV01.controlledTransition,
      moneyAdjacent: false,
      primaryKey: 'case_id',
      buildSpecTypes: [
        'CanonicalFraudEventTypesV01.caseOpened',
        'CanonicalFraudEventTypesV01.caseResolved',
      ],
      notes: 'Investigation workflow; resolution drives reward.release vs clawback paths.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.withdrawal,
      collectionName: 'withdrawal_request',
      mutability: BackendSchemaMutabilityV01.controlledTransition,
      moneyAdjacent: true,
      primaryKey: 'withdrawal_id',
      buildSpecTypes: [
        'PayoutRequestV01',
        'CanonicalWithdrawalEventTypesV01',
      ],
      notes: 'Debits **available** lots only (Rule 4); pairs with wallet.* lock/spend ledger lines.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.conversion,
      collectionName: 'conversion_event',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: true,
      primaryKey: 'conversion_id',
      buildSpecTypes: ['ConversionEventV01'],
      notes: 'Immutable record of coin conversion; child ledger + new lot ids live in payload / refs.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.admin,
      collectionName: 'admin_audit_log',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: false,
      primaryKey: 'audit_id',
      buildSpecTypes: ['CanonicalAdminEventTypesV01', 'SystemEventV01 (admin actor)'],
      notes: 'Human intent and context (Rule 6); economic effect is always compensating ledger lines.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.admin,
      collectionName: 'admin_compensating_intent',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: true,
      primaryKey: 'intent_id',
      buildSpecTypes: ['CanonicalAdminEventTypesV01.walletAdjustmentCreated'],
      notes: 'Settlement worker turns intent into wallet_ledger_entry; never direct balance PATCH.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.policy,
      collectionName: 'policy_version',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: false,
      primaryKey: 'policy_version_id',
      buildSpecTypes: [
        'CanonicalPolicyEventTypesV01.versionCreated',
        'CanonicalPolicyEventTypesV01.versionActivated',
      ],
      notes: 'Immutable version rows; activation is a new pointer or activation event.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.policy,
      collectionName: 'policy_active_pointer',
      mutability: BackendSchemaMutabilityV01.referenceData,
      moneyAdjacent: false,
      primaryKey: 'environment',
      buildSpecTypes: [],
      notes: 'Single row per env (prod/stage) pointing at active policy_version_id.',
    ),
    BackendTableDescriptorV01(
      domain: BackendSchemaDomainV01.eventLog,
      collectionName: 'system_event',
      mutability: BackendSchemaMutabilityV01.appendOnly,
      moneyAdjacent: true,
      primaryKey: 'event_id',
      buildSpecTypes: ['SystemEventV01', 'MvpBackendEventSetV01'],
      notes: 'Outbox / event store for cross-domain replay; §19 idempotency on money-moving types.',
    ),
  ];

  /// Normative pipeline labels (align with §18 comments in [build_spec_v01.dart]).
  static const List<String> primaryEconomyPipeline = [
    'attention_session',
    'attention_verification',
    'presence_verification',
    'presence_decision',
    'budget_reservation',
    'reward_decision',
    'wallet_value_lot',
    'wallet_ledger_entry',
    'wallet_balance_projection',
    'trust_signal',
    'fraud_flag',
    'withdrawal_request',
  ];

  static Set<BackendSchemaDomainV01> get domainsCovered =>
      tables.map((t) => t.domain).toSet();

  static BackendTableDescriptorV01? tableByCollectionName(String name) {
    for (final t in tables) {
      if (t.collectionName == name) return t;
    }
    return null;
  }
}
