import { useMemo } from 'react'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { DEFAULT_SPONSORED_OFFER } from '../data/demoData'
import { formatIcoinsAmount } from '../lib/format'
import { useDemo } from '../state/useDemo'

export function RewardRevealScreen() {
  const { selectedOffer, finishRewardToWallet, canRedeemReward, attentionSession, proofSubmitting, walletSyncing } = useDemo()
  const offer = selectedOffer ?? DEFAULT_SPONSORED_OFFER
  const refLine = useMemo(() => 'i·2f9b·7m4k', [])
  const dwell = offer.watchDuration ?? '4:30'

  return (
    <PhoneFrame variant="void">
      <div className="coin-unlock-shell">
        <div className="unlock-label-prot">new coin unlocked</div>
        <div className="reward-center-prot">
          <div className="reward-amount-prot mono">+{offer.rewardICoins.toFixed(2)}</div>
          <div className="reward-label-prot">icoins credited to your wallet</div>
          <div className="reward-breakdown-prot">
            <div className="rb-row-prot">
              <span className="rb-l-prot">Source</span>
              <span className="rb-v-prot">{offer.brand}</span>
            </div>
            <div className="rb-row-prot">
              <span className="rb-l-prot">Attention score</span>
              <span className="rb-v-prot" style={{ color: 'var(--icoin-primary)' }}>
                {offer.attentionScoreDisplay ?? '80 / 100'}
              </span>
            </div>
            <div className="rb-row-prot">
              <span className="rb-l-prot">Watch time</span>
              <span className="rb-v-prot mono">{dwell} complete</span>
            </div>
            <div className="rb-row-prot">
              <span className="rb-l-prot">Ref</span>
              <span className="rb-v-prot mono rb-ref">{refLine}</span>
            </div>
          </div>
          <p className="coin-tag-prot">{formatIcoinsAmount(offer.rewardICoins)} — routed on-platform only.</p>
          <div className="cta-row-unlock">
            <Button
              variant="ghost"
              className="cta-btn-unlock ghost"
              disabled={!canRedeemReward}
              onClick={() => finishRewardToWallet()}
            >
              Later
            </Button>
            <Button
              className="cta-btn-unlock primary"
              disabled={!canRedeemReward || proofSubmitting || walletSyncing}
              onClick={() => finishRewardToWallet()}
            >
              {proofSubmitting || walletSyncing
                ? 'Sealing proof…'
                : canRedeemReward
                  ? 'See wallet update'
                  : 'Session invalid'}
            </Button>
          </div>
          {!canRedeemReward && attentionSession?.status === 'redeemed' ? (
            <p className="mono-muted" style={{ marginTop: 12, fontSize: 12 }}>
              Reward already redeemed for this session.
            </p>
          ) : null}
        </div>
      </div>
      <SourceEvidence
        paths={[
          '06_feed_earning_loops/iapp_loop1_watch_verify_earn.html',
          '07_currency_system/acoins_earning_system.html',
          'integrations/eye-tracking/demos/investor-demo/src/screens/RewardRevealScreen.tsx',
        ]}
      />
    </PhoneFrame>
  )
}
