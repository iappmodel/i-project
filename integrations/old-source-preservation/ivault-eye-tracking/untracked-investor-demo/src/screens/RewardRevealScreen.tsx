import { useMemo } from 'react'
import { PhoneFrame } from '../components/PhoneFrame'
import { formatIcoinsAmount } from '../demo/format'
import { DEFAULT_SPONSORED_OFFER } from '../demo/mockData'
import { useDemo } from '../demo/useDemo'

/** `iapp_loop1_watch_verify_earn (5).html` step 6 + `iapp_coin_unlock_moment.html` motion */
export function RewardRevealScreen() {
  const { selectedOffer, finishRewardToWallet } = useDemo()
  const offer = selectedOffer ?? DEFAULT_SPONSORED_OFFER
  const refLine = useMemo(() => 'i·2f9b·7m4k', [])
  const dwell = offer.watchDuration ?? '4:30'

  return (
    <PhoneFrame variant="void">
      <div className="coin-unlock-shell">
        <div className="bg-ring-prot" />
        <div className="bg-ring-prot bg-ring-prot--d1" />
        <div className="bg-ring-prot bg-ring-prot--d2" />

        <div className="unlock-label-prot">new coin unlocked</div>

        <div className="reward-center-prot">
          <div className="reward-ring-wrap-prot">
            <div className="reward-ring-prot r1" />
            <div className="reward-ring-prot r2" />
            <div className="reward-coin-prot">
              <div className="reward-i-prot">i</div>
            </div>
          </div>

          <div className="reward-amount-prot mono">
            +{offer.rewardICoins.toFixed(2)}
          </div>
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
            <button type="button" className="cta-btn-unlock ghost" onClick={() => finishRewardToWallet()}>
              Later
            </button>
            <button type="button" className="cta-btn-unlock primary" onClick={() => finishRewardToWallet()}>
              See wallet update
            </button>
          </div>

          <div className="unlock-dot-row">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={`unlock-dot ${i === 2 ? 'active' : ''}`} />
            ))}
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}
