import { useEffect, useMemo, useState } from 'react'
import { BackRow } from '../components/BackRow'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { useDemo } from '../state/useDemo'

type ToType = 'icoins' | 'mcoins' | 'ucoins'
const rates: Record<ToType, number> = { icoins: 100, mcoins: 60, ucoins: 50 }

export function ConvertScreen() {
  const { aCoins, walletBalance, setScreen } = useDemo()
  const [amt, setAmt] = useState(500)
  const [toType, setToType] = useState<ToType>('icoins')
  const [phase, setPhase] = useState<'form' | 'clearing' | 'done'>('form')
  const [gateIdx, setGateIdx] = useState(-1)

  const tierMult = 1.15
  const fee = 0.05

  const { pooled, feeAmt, received } = useMemo(() => {
    const pooledRaw = Math.round(amt * tierMult)
    const feeRaw = Math.round(pooledRaw * fee)
    const net = pooledRaw - feeRaw
    const recv = Math.floor(net / rates[toType])
    return { pooled: pooledRaw, feeAmt: feeRaw, received: recv }
  }, [amt, toType])

  const clearingGates = useMemo(
    () => [
      { icon: 'r', name: 'Pool entry', passLine: `${amt.toLocaleString()} acoins → pool` },
      { icon: '×', name: 'Tier 2 multiplier (1.15×)', passLine: `${pooled.toLocaleString()} rcoins` },
      { icon: '%', name: 'Pool fee (5%)', passLine: `−${feeAmt} rcoins` },
      { icon: '→', name: 'icoins output', passLine: `${received} icoins` },
      { icon: '✓', name: 'Ledger write', passLine: `Sealed · ref CK-${Math.floor(8100 + received * 11)}` },
    ],
    [amt, pooled, feeAmt, received],
  )

  useEffect(() => {
    if (phase !== 'clearing') return
    let cancelled = false
    const ids: ReturnType<typeof setTimeout>[] = []
    ids.push(window.setTimeout(() => { if (!cancelled) setGateIdx(-1) }, 0))
    clearingGates.forEach((_, idx) => {
      ids.push(
        window.setTimeout(() => {
          if (!cancelled) setGateIdx(idx)
        }, (idx + 1) * 520),
      )
    })
    ids.push(
      window.setTimeout(() => {
        if (!cancelled) setPhase('done')
      }, clearingGates.length * 520 + 480),
    )
    return () => {
      cancelled = true
      ids.forEach(clearTimeout)
    }
  }, [phase, clearingGates])

  if (phase === 'clearing' || phase === 'done') {
    return (
      <PhoneFrame scroll>
        <BackRow label="Convert" onBack={() => (phase === 'done' ? setScreen('wallet') : setPhase('form'))} />
        <h1 className="screen-title">{phase === 'done' ? 'Converted' : 'Clearing…'}</h1>
        <div className="conv-gate-box">
          {clearingGates.map((g, idx) => (
            <div key={g.name} className="conv-gate-row">
              <div className={`conv-gate-ic ${gateIdx >= idx ? 'pass' : ''}`}>{g.icon}</div>
              <div className="conv-gate-mid">
                <div className="conv-gate-name">{g.name}</div>
                <div className={`conv-gate-status mono ${gateIdx >= idx ? 'ok' : ''}`}>
                  {gateIdx >= idx ? g.passLine : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
        {phase === 'done' && (
          <Button className="prot-cta" onClick={() => setScreen('wallet')}>
            Back to wallet
          </Button>
        )}
        <SourceEvidence
          paths={[
            '04_wallet_payments/iapp_convert_screen.html',
            '04_wallet_payments/iapp_conversion_confirmation (1).html',
          ]}
        />
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame scroll>
      <BackRow label="Wallet" onBack={() => setScreen('wallet')} />
      <h1 className="screen-title">Convert</h1>
      <p className="screen-sub">
        Tier 2 · reference ≈ ${walletBalance.toFixed(2)}
      </p>
      <input
        className="amount-input-prot mono"
        type="number"
        value={amt}
        min={1}
        max={aCoins}
        onChange={(e) => setAmt(Math.min(aCoins, Math.max(1, Number(e.target.value) || 0)))}
      />
      <div className="to-selector-prot">
        {(['icoins', 'mcoins', 'ucoins'] as ToType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`to-btn-prot ${toType === t ? 'on' : ''}`}
            onClick={() => setToType(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="breakdown-prot">
        <div className="bk-row-prot bk-total-prot">
          <span>You receive</span>
          <span className="mono ic">
            {received.toLocaleString()} {toType}
          </span>
        </div>
      </div>
      <Button disabled={amt <= 0} onClick={() => setPhase('clearing')}>
        Confirm conversion
      </Button>
      <Button variant="ghost" style={{ marginTop: 8 }} onClick={() => setScreen('wallet')}>
        Cancel
      </Button>
      <SourceEvidence
        paths={[
          '04_wallet_payments/iapp_convert_screen.html',
          '04_wallet_payments/iapp_conversion_confirmation (1).html',
          'integrations/eye-tracking/demos/investor-demo/src/screens/ConvertScreen.tsx',
        ]}
      />
    </PhoneFrame>
  )
}
