import { useEffect, useMemo, useState } from 'react'
import { BackRow } from '../components/BackRow'
import { PhoneFrame } from '../components/PhoneFrame'
import { useDemo } from '../demo/useDemo'

type ToType = 'icoins' | 'mcoins' | 'ucoins'

const rates: Record<ToType, number> = { icoins: 100, mcoins: 60, ucoins: 50 }

export function ConvertScreen() {
  const { iCoins, aCoins, walletBalance, setScreen } = useDemo()
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
      {
        icon: 'r',
        name: 'Pool entry',
        passLine: `${amt.toLocaleString()} acoins → pool`,
      },
      {
        icon: '×',
        name: 'Tier 2 multiplier (1.15×)',
        passLine: `${pooled.toLocaleString()} rcoins (+${(pooled - amt).toLocaleString()})`,
      },
      {
        icon: '%',
        name: 'Pool fee (5%)',
        passLine: `−${feeAmt} rcoins`,
      },
      {
        icon: '→',
        name: 'icoins output',
        passLine: `${received} icoins`,
      },
      {
        icon: '✓',
        name: 'Ledger write',
        passLine: `Sealed · ref CK-${Math.floor(8100 + received * 11)}`,
      },
    ],
    [amt, pooled, feeAmt, received],
  )

  useEffect(() => {
    if (phase !== 'clearing') return
    let cancelled = false
    const ids: ReturnType<typeof setTimeout>[] = []
    ids.push(
      window.setTimeout(() => {
        if (!cancelled) setGateIdx(-1)
      }, 0),
    )
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

  const toColors: Record<ToType, { bg: string; color: string; sym: string }> = {
    icoins: { bg: 'rgba(249,115,22,0.1)', color: '#f97316', sym: 'i' },
    mcoins: { bg: 'rgba(0,229,255,0.1)', color: '#00e5ff', sym: 'm' },
    ucoins: { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa', sym: 'u' },
  }

  if (phase === 'clearing' || phase === 'done') {
    return (
      <PhoneFrame scroll>
        <BackRow label="Convert" onBack={() => (phase === 'done' ? setScreen('wallet') : setPhase('form'))} />
        <div className="conv-confirm-root">
          {phase === 'clearing' && <div className="proc-ring-prot-spin" aria-hidden />}
          <h1 className="screen-title prot-cc-title">{phase === 'done' ? 'Converted' : 'Clearing…'}</h1>
          <p className="conv-proc-sub">{amt.toLocaleString()} acoins · Tier 2 multiplier applying → {toType}</p>

          <div className="conv-gate-box">
            {clearingGates.map((g, idx) => {
              const ok = gateIdx >= idx
              return (
                <div key={g.name} className="conv-gate-row">
                  <div className={`conv-gate-ic ${ok ? 'pass' : ''}`}>{g.icon}</div>
                  <div className="conv-gate-mid">
                    <div className="conv-gate-name">{g.name}</div>
                    <div className={`conv-gate-status mono ${ok ? 'ok' : ''}`}>{ok ? g.passLine : '—'}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {phase === 'done' && (
            <div className="conv-done-block">
              <p className="wallet-update-strip">
                Wallet updated · balance now {(iCoins + received).toLocaleString()} icoins
              </p>
              <div className="receipt-mini">
                <div className="rec-row">
                  <span>You sent</span>
                  <span className="mono">{amt.toLocaleString()} acoins</span>
                </div>
                <div className="rec-row">
                  <span>Pool cleared</span>
                  <span className="mono">{pooled.toLocaleString()} rcoins</span>
                </div>
                <div className="rec-row">
                  <span>Pool fee (5%)</span>
                  <span className="mono">
                    −{feeAmt} rcoins
                  </span>
                </div>
                <div className="rec-row accent">
                  <span>You received</span>
                  <span className="mono">+{received} icoins</span>
                </div>
              </div>
              <button type="button" className="prot-cta" onClick={() => setScreen('wallet')}>
                Back to wallet
              </button>
            </div>
          )}
        </div>
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame scroll>
      <BackRow label="Wallet" onBack={() => setScreen('wallet')} />
      <h1 className="screen-title">Convert</h1>
      <p className="screen-sub">
        Your trust tier: <span>Tier 2</span> · 1.15× multiplier active · reference ≈ $
        {walletBalance.toFixed(2)}
      </p>

      <div className="cvt-from-card">
        <div className="cvt-fc-label">FROM</div>
        <div className="cvt-fc-row">
          <div className="cvt-fc-coin-a mono">a</div>
          <div className="cvt-fc-name">acoins</div>
          <div className="cvt-fc-bal mono">{aCoins.toLocaleString()} available</div>
        </div>
        <div className="amt-row-prot">
          <input
            className="amount-input-prot mono"
            type="number"
            value={amt}
            min={1}
            max={aCoins}
            onChange={(e) => setAmt(Math.min(aCoins, Math.max(1, Number(e.target.value) || 0)))}
          />
          <span className="amt-sym-prot">acoins</span>
        </div>
        <div className="pct-row-prot">
          {[25, 50, 75, 100].map((p) => (
            <button
              key={p}
              type="button"
              className="pct-btn-prot"
              onClick={() => setAmt(Math.floor((aCoins * p) / 100))}
            >
              {p === 100 ? 'Max' : `${p}%`}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="swap-btn-prot" aria-label="Swap placeholder" disabled>
        ⇅
      </button>

      <div className="cvt-to-card">
        <div className="cvt-fc-label">TO</div>
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
        <div className="cvt-fc-row">
          <div
            className="cvt-fc-coin-to mono"
            style={{ background: toColors[toType].bg, color: toColors[toType].color }}
          >
            {toColors[toType].sym}
          </div>
          <div className="cvt-fc-name">{toType}</div>
          <div className="to-receive-prot mono">{received.toLocaleString()} awaiting</div>
        </div>
      </div>

      <div className="breakdown-prot">
        <div className="bk-row-prot">
          <span>You send</span>
          <span className="mono">{amt.toLocaleString()} acoins</span>
        </div>
        <div className="bk-row-prot">
          <span>Tier 2 multiplier (1.15×)</span>
          <span style={{ color: 'var(--icoin-primary)' }} className="mono">
            +{(pooled - amt).toLocaleString()} rcoins
          </span>
        </div>
        <div className="bk-row-prot">
          <span>Pool fee (5%)</span>
          <span className="mono" style={{ color: 'var(--text-secondary)' }}>
            −{feeAmt.toLocaleString()} rcoins
          </span>
        </div>
        <div className="bk-row-prot bk-total-prot">
          <span>You receive</span>
          <span className="mono ic">
            {received.toLocaleString()} {toType}
          </span>
        </div>
      </div>

      <div className="trust-pill-prot">
        <span className="trust-dot-prot" />
        <span className="trust-text-prot">
          Tier 2 bonus: +15% on pool clearing · next tier at 90-day milestone
        </span>
      </div>

      <button type="button" className="prot-cta" disabled={amt <= 0} onClick={() => setPhase('clearing')}>
        Confirm conversion
      </button>
      <p className="legal-hint mono-muted">
        Parity refs: iapp_convert_screen · iapp_conversion_confirmation.
      </p>
    </PhoneFrame>
  )
}
