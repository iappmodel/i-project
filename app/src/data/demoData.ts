import type {
  CreatorCampaign,
  EconomicSplit,
  Offer,
  ProofLayerStatus,
  Transaction,
  VerificationGateDef,
} from '../state/types'

/** Aligned with `06_feed_earning_loops/iapp_feed_screen.html` + Loop 1 offer row */
export const DEFAULT_SPONSORED_OFFER: Offer = {
  id: 'nike-pegasus-41',
  brand: 'Nike Running',
  title: 'Run the world — new Pegasus 41 campaign',
  description:
    'Pegasus 41 launch spot — demo uses mocked gaze signals; five verification gates settle before payout.',
  platform: 'YouTube · Sponsored',
  rewardICoins: 2,
  sponsorLabel: 'YouTube · Sponsored',
  platformCode: 'YT',
  watchDuration: '4:30',
  attentionScoreDisplay: '80 / 100',
  campaignTagline: 'Pegasus 41 launch campaign',
  creatorHandle: 'Brand · Watch to earn',
  captionTags: '#Nike #running',
  thumbnailGradient: 'linear-gradient(135deg,#0a1a10,#0d1a1a,#0a0d1a)',
}

/** `05_creator_campaigns/campaign_builder_owner.html` — owner-side campaign */
export const CREATOR_CAMPAIGN: CreatorCampaign = {
  id: 'camp-nike-peg41',
  name: 'Pegasus 41 · Spring launch',
  brand: 'Nike Running',
  budgetICoins: 12000,
  cpm: 4.2,
  status: 'live',
}

/** Canonical 60 / 30 / 10 — `05_creator_campaigns/iapp_creator_economy.html` */
export const ECONOMIC_SPLIT: EconomicSplit = {
  creatorPct: 60,
  viewerPct: 30,
  platformPct: 10,
}

export const WALLET_INITIAL = {
  walletBalanceUsd: 142.06,
  pendingBalance: 38,
  aCoins: 1840,
  iCoins: 847,
  iCoinsPending: 18,
}

export const VERIFICATION_GATES: VerificationGateDef[] = [
  {
    id: 'presence',
    name: 'Presence detected',
    pendingLabel: 'Checking…',
    passLabel: 'On-device presence · seated',
  },
  {
    id: 'dwell',
    name: 'Required watch time met',
    pendingLabel: 'Pending',
    passLabel: 'Elapsed · watch duration verified',
  },
  {
    id: 'attention',
    name: 'Attention score passed',
    pendingLabel: 'Pending',
    passLabel: '80 / 100 clears threshold',
  },
  {
    id: 'completion',
    name: 'Completion received',
    pendingLabel: 'Pending',
    passLabel: 'Session sealed · payout eligible',
  },
  {
    id: 'fraud',
    name: 'Fraud flags clean',
    pendingLabel: 'Pending',
    passLabel: 'No anomalies · no escalation',
  },
]

/** Consent gate proof-layer card — presenter-facing labels */
export const CONSENT_PROOF_STATUS = {
  reactDemo: 'simulated',
  flutterRuntime: 'promoted',
  androidSmokeTest: 'pending',
} as const

/** Proof layer — docs/technical/* + flutter-runtime promotion */
export const PROOF_LAYER_STATUS: ProofLayerStatus = {
  demoMode: 'mocked-gaze · live wallet + SSE relay',
  flutterRuntime: 'promoted · posts to validator · SSE notifies React wallet',
  androidSmokeTest: 'runbook + smoke_android_env · device tap manual',
  signalPath: [
    'Camera → MediaPipe landmarks',
    'gaze x/y + quality',
    'fixation / dwell',
    'Seal Proof → Proof Packet v0',
    'POP validator → pending hold → ledger',
  ],
  governanceKernelPresent: true,
}

export function initialTransactions(): Transaction[] {
  return [
    {
      id: 't1',
      source: 'Focus session',
      timeLabel: '20m ago',
      amountDisplay: '+28 a',
      kind: 'positive',
    },
    {
      id: 't2',
      source: 'Converted',
      timeLabel: '1h ago',
      amountDisplay: '+34 i',
      kind: 'positive',
    },
    {
      id: 't3',
      source: 'Conversion · pending settlement',
      timeLabel: 'Clearing · est. 2h',
      amountDisplay: '+18 i pending',
      kind: 'pending',
    },
    {
      id: 't4',
      source: 'Cash preview · ACH',
      timeLabel: 'Queued',
      amountDisplay: '−84 i',
      kind: 'negative',
    },
  ]
}

export const SCREEN_FLOW = [
  'splash',
  'feed',
  'offer-detail',
  'consent-camera-gate',
  'watch-verify',
  'verification-result',
  'reward-reveal',
  'wallet',
  'convert',
  'withdraw-preview',
  'creator-economics',
  'proof-layer',
  'roadmap',
] as const
