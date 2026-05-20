import { useMemo, useState } from 'react'
import { BackRow } from '../components/BackRow'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { useDemo } from '../state/useDemo'

type WD = 'bank' | 'card' | 'ext'
const wFees: Record<WD, number> = { bank: 0, card: 0.015, ext: 0.025 }
const wTimes: Record<WD, string> = { bank: '1–2 business days', card: 'Instant', ext: '~10 minutes' }

export function WithdrawPreviewScreen() {
  const { iCoins, setScreen } = useDemo()
  const [amt, setAmt] = useState(200)
  const [dest, setDest] = useState<WD>('bank')
  const icMax = Math.max(1, iCoins)

  const { feeI, usdReceive } = useMemo(() => {
    const fee = Math.round(amt * wFees[dest])
    const net = amt - fee
    return { feeI: fee, usdReceive: net * 0.01 }
  }, [amt, dest])

  return (
    <PhoneFrame scroll>
      <BackRow label="Wallet" onBack={() => setScreen('wallet')} />
      <h1 className="screen-title">Withdraw</h1>
      <p className="screen-sub">Move icoins to bank or card · demo preview only.</p>
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
          <button
            key={p}
            type="button"
            className="pct-btn-prot"
            onClick={() => setAmt(Math.floor((icMax * p) / 100))}
          >
            {p === 100 ? 'Max' : `${p}%`}
          </button>
        ))}
      </div>
      {(['bank', 'card', 'ext'] as WD[]).map((d) => (
        <button
          key={d}
          type="button"
          className={`dest-row-prot ${dest === d ? 'on' : ''}`}
          onClick={() => setDest(d)}
        >
          <span className="dest-name-prot">
            {d === 'bank' ? 'Bank account' : d === 'card' ? 'Debit card' : 'External wallet'}
          </span>
          <span className={`dest-radio-prot ${dest === d ? 'sel' : ''}`} aria-hidden />
        </button>
      ))}
      <div className="breakdown-withdraw prot">
        <div className="bk-row-withdraw">
          <span>You send</span>
          <span className="mono">{amt.toLocaleString()} icoins</span>
        </div>
        <div className="bk-row-withdraw">
          <span>Arrival</span>
          <span className="mono">{wTimes[dest]}</span>
        </div>
        <div className="bk-row-withdraw total">
          <span>You receive</span>
          <span className="mono">${usdReceive.toFixed(2)} USD</span>
        </div>
        {feeI > 0 && (
          <div className="bk-row-withdraw">
            <span>Fee</span>
            <span className="mono">−{feeI} i</span>
          </div>
        )}
      </div>
      <Button onClick={() => setScreen('creator-economics')}>Confirm withdraw preview</Button>
      <Button variant="ghost" style={{ marginTop: 8 }} onClick={() => setScreen('wallet')}>
        Back to wallet
      </Button>
      <SourceEvidence
        paths={[
          '04_wallet_payments/iapp_withdraw_screen (1).html',
          '04_wallet_payments/wallet_pending_tab.html',
          'integrations/eye-tracking/demos/investor-demo/src/screens/WithdrawPreviewScreen.tsx',
        ]}
      />
    </PhoneFrame>
  )
}
