import type { Offer, Transaction } from './types'

/** Aligned with `iapp_feed_screen (1).html` sponsored card + `iapp_loop1_watch_verify_earn (5).html` offer row */
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
