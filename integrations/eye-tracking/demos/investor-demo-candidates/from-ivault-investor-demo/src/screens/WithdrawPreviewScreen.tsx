import { useMemo, useState } from 'react'
import { BackRow } from '../components/BackRow'
import { PhoneFrame } from '../components/PhoneFrame'
import { useDemo } from '../demo/useDemo'

type WD = 'bank' | 'card' | 'ext'

const wFees: Record<WD, number> = { bank: 0, card: 0.015, ext: 0.025 }
const wTimes: Record<WD, string> = {
  bank: '1–2 business days',
  card: 'Instant',
  ext: '~10 minutes',
}
const pillText: Record<WD, string> = {
  bank: 'Bank transfer: arrives in 1–2 business days. No platform fee.',
  card: 'Instant to debit card. 1.5% settlement fee applies.',
  ext: 'External wallet via xcoins bridge. Requires Trust Tier 4. 2.5% fee.',
}
const dotColor: Record<WD, string> = {
  bank: 'var(--icoin-primary)',
  card: 'var(--accent-amber)',
  ext: 'var(--accent-rose)',
}

export function WithdrawPreviewScreen() {
  const { iCoins, setScreen } = useDemo()
  const [amt, setAmt] = useState(200)
  const [dest, setDest] = useState<WD>('bank')

  const icMax = Math.max(1, iCoins)

  const { feeI, usdReceive } = useMemo(() => {
    const feeI = Math.round(amt * wFees[dest])
    const net = amt - feeI
    const usd = net * 0.01
    return { feeI, usdReceive: usd }
  }, [amt, dest])

  return (
    <PhoneFrame scroll>
      <BackRow label="Wallet" onBack={() => setScreen('wallet')} />
      <h1 className="screen-title">Withdraw</h1>
      <p className="screen-sub">Move icoins to your bank or card · demo only.</p>

      <div className="withdraw-card-prot">
        <div className="cvt-fc-label">From</div>
        <div className="w-card-row-prot">
          <div className="w-coin-dot-prot mono">i</div>
          <div className="w-coin-name-prot">icoins</div>
          <div className="w-coin-avail-prot mono">{iCoins.toLocaleString()} available</div>
        </div>
        <input
          className="withdraw-big-input mono"
          type="number"
          value={amt}
          min={1}
          max={icMax}
          onChange={(e) => setAmt(Math.min(icMax, Math.max(1, Number(e.target.value) || 0)))}
        />
        <div className="pct-row-prot">
          {[25, 50, 75, 100].map((p) => (
            <button key={p} type="button" className="pct-btn-prot" onClick={() => setAmt(Math.floor((icMax * p) / 100))}>
              {p === 100 ? 'Max' : `${p}%`}
            </button>
          ))}
        </div>
      </div>

      <p className="dest-label-prot">To</p>

      {(['bank', 'card', 'ext'] as WD[]).map((d) => (
        <button
          key={d}
          type="button"
          className={`dest-row-prot ${dest === d ? 'on' : ''}`}
          onClick={() => setDest(d)}
        >
          <span className="dest-icon-prot">{d === 'bank' ? 'B' : d === 'card' ? 'C' : 'X'}</span>
          <span className="dest-info-prot">
            <span className="dest-name-prot">{d === 'bank' ? 'Bank account' : d === 'card' ? 'Debit card' : 'External wallet'}</span>
            <span className="dest-detail-prot">
              {d === 'bank' ? 'Chase ···4821 · 1–2 business days · free' : ''}
              {d === 'card' ? 'Visa ···9204 · instant · 1.5% fee' : ''}
              {d === 'ext' ? 'Requires xcoins · Trust Tier 4 only' : ''}
            </span>
          </span>
          <span className={`dest-radio-prot ${dest === d ? 'sel' : ''}`} aria-hidden />
        </button>
      ))}

      <div className="breakdown-withdraw prot">
        <div className="bk-row-withdraw"><span>You send</span><span className="mono">{amt.toLocaleString()} icoins</span></div>
        {feeI > 0 ? (
          <div className="bk-row-withdraw">
            <span>Settlement fee</span>
            <span className="mono" style={{ color: 'var(--accent-rose)' }}>−{feeI.toLocaleString()} icoins</span>
          </div>
        ) : (
          <div className="bk-row-withdraw">
            <span>Platform fee</span>
            <span className="mono" style={{ color: 'var(--icoin-primary)' }}>Free</span>
          </div>
        )}
        <div className="bk-row-withdraw">
          <span>Arrival</span>
          <span className="mono">{wTimes[dest]}</span>
        </div>
        <div className="bk-row-withdraw total">
          <span>You receive</span>
          <span className="mono">${usdReceive.toFixed(2)} USD</span>
        </div>
      </div>

      <div className="withdraw-pill-prot">
        <span className="withdraw-pill-dot" style={{ background: dotColor[dest] }} />
        <span className="withdraw-pill-txt">{pillText[dest]}</span>
      </div>

      <button type="button" className="prot-cta" onClick={() => setScreen('wallet')}>
        Withdraw
      </button>
    </PhoneFrame>
  )
}
