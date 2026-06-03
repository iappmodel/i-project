import { useEffect, useMemo, useState } from 'react'
import { BackRow } from '../components/BackRow'
import { Button } from '../components/Button'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { formatCoinLabel } from '../lib/format'
import {
  previewTransfer,
  transferCoins,
  transferCoinsDemo,
  transferLimits,
  type TransferDirection,
} from '../services/transferCoins'
import { useDemo } from '../state/useDemo'

export function ConvertScreen() {
  const {
    aCoins,
    iCoins,
    walletBackend,
    appMode,
    setScreen,
    applyTransferBalances,
    prependTransactions,
  } = useDemo()

  const [direction, setDirection] = useState<TransferDirection>('vicoin_to_icoin')
  const [amt, setAmt] = useState(50)
  const [phase, setPhase] = useState<'form' | 'clearing' | 'done'>('form')
  const [gateIdx, setGateIdx] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const [lastReceived, setLastReceived] = useState(0)

  const limits = transferLimits(direction)
  const maxSource = direction === 'vicoin_to_icoin' ? aCoins : iCoins
  const preview = previewTransfer(direction, amt)

  const clearingGates = useMemo(() => {
    const spentLabel = `${amt.toLocaleString()} ${
      direction === 'vicoin_to_icoin' ? formatCoinLabel('vicoin') : formatCoinLabel('icoin')
    }`
    const recvLabel = `${lastReceived.toLocaleString()} ${
      direction === 'vicoin_to_icoin' ? formatCoinLabel('icoin') : formatCoinLabel('vicoin')
    }`
    return [
      { icon: '→', name: 'Exchange', passLine: `10 ${formatCoinLabel('vicoin')} = 1 ${formatCoinLabel('icoin')}` },
      { icon: '−', name: 'Source spent', passLine: spentLabel },
      { icon: '+', name: 'Target received', passLine: recvLabel },
      { icon: '✓', name: 'Ledger write', passLine: 'Sealed · server-authoritative' },
    ]
  }, [amt, direction, lastReceived])

  useEffect(() => {
    if (phase !== 'clearing') return
    let cancelled = false
    const ids: ReturnType<typeof setTimeout>[] = []
    ids.push(window.setTimeout(() => { if (!cancelled) setGateIdx(-1) }, 0))
    clearingGates.forEach((_, idx) => {
      ids.push(
        window.setTimeout(() => {
          if (!cancelled) setGateIdx(idx)
        }, (idx + 1) * 480),
      )
    })
    ids.push(
      window.setTimeout(() => {
        if (!cancelled) setPhase('done')
      }, clearingGates.length * 480 + 420),
    )
    return () => {
      cancelled = true
      ids.forEach(clearTimeout)
    }
  }, [phase, clearingGates])

  async function runTransfer() {
    setError(null)
    if (!preview.valid) {
      setError(preview.hint ?? 'Invalid amount')
      return
    }

    const result =
      walletBackend === 'live'
        ? await transferCoins(direction, amt)
        : await transferCoinsDemo(direction, amt, { icoin: iCoins, vicoin: aCoins })

    if (!result.success) {
      setError(result.error ?? 'Conversion failed')
      return
    }

    setLastReceived(result.target_received)
    applyTransferBalances(result.new_icoin_balance, result.new_vicoin_balance)
    const spentLabel =
      direction === 'vicoin_to_icoin'
        ? `${result.source_spent} v → ${result.target_received} i`
        : `${result.source_spent} i → ${result.target_received} v`
    prependTransactions([
      {
        id: `tx-convert-${result.transfer_id ?? Date.now()}`,
        source: 'Convert',
        timeLabel: 'Just now',
        amountDisplay: spentLabel,
        kind: 'positive',
      },
    ])
    setPhase('clearing')
  }

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
          <Button className="prot-cta" onClick={() => setScreen('immersive-feed')}>
            Back to feed
          </Button>
        )}
        {appMode === 'presenter' ? (
          <SourceEvidence
            paths={[
              '04_wallet_payments/iapp_convert_screen.html',
              'eye-earn-sparkle-archive/supabase/functions/transfer-coins',
            ]}
          />
        ) : null}
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame scroll>
      <BackRow label="Wallet" onBack={() => setScreen('immersive-feed')} />
      <h1 className="screen-title">Convert</h1>
      <p className="screen-sub">10 {formatCoinLabel('vicoin')} = 1 {formatCoinLabel('icoin')} · server rate</p>

      <div className="to-selector-prot">
        <button
          type="button"
          className={`to-btn-prot ${direction === 'vicoin_to_icoin' ? 'on' : ''}`}
          onClick={() => {
            setDirection('vicoin_to_icoin')
            setAmt(Math.min(50, aCoins))
          }}
        >
          {formatCoinLabel('vicoin')} → {formatCoinLabel('icoin')}
        </button>
        <button
          type="button"
          className={`to-btn-prot ${direction === 'icoin_to_vicoin' ? 'on' : ''}`}
          onClick={() => {
            setDirection('icoin_to_vicoin')
            setAmt(Math.min(100, iCoins))
          }}
        >
          {formatCoinLabel('icoin')} → {formatCoinLabel('vicoin')}
        </button>
      </div>

      <input
        className="amount-input-prot mono"
        type="number"
        value={amt}
        min={limits.min}
        max={Math.min(limits.max, maxSource)}
        onChange={(e) =>
          setAmt(
            Math.min(
              limits.max,
              maxSource,
              Math.max(limits.min, Number(e.target.value) || 0),
            ),
          )
        }
      />
      <p className="screen-sub mono">
        {limits.min}–{limits.max}{' '}
        {direction === 'icoin_to_vicoin' ? '(÷10)' : ''} · balance{' '}
        {direction === 'vicoin_to_icoin'
          ? `${aCoins.toLocaleString()} ${formatCoinLabel('vicoin')}`
          : `${iCoins.toLocaleString()} ${formatCoinLabel('icoin')}`}
      </p>

      <div className="breakdown-prot">
        <div className="bk-row-prot bk-total-prot">
          <span>You receive</span>
          <span className="mono ic">
            {preview.valid
              ? `${preview.received.toLocaleString()} ${
                  direction === 'vicoin_to_icoin'
                    ? formatCoinLabel('icoin')
                    : formatCoinLabel('vicoin')
                }`
              : '—'}
          </span>
        </div>
      </div>

      {error ? <p className="screen-sub" style={{ color: '#f87171' }}>{error}</p> : null}

      <Button disabled={!preview.valid || amt <= 0} onClick={() => void runTransfer()}>
        Confirm conversion
      </Button>
      <Button variant="ghost" style={{ marginTop: 8 }} onClick={() => setScreen('immersive-feed')}>
        Cancel
      </Button>

      {appMode === 'presenter' ? (
        <SourceEvidence
          paths={[
            '04_wallet_payments/iapp_convert_screen.html',
            'app/supabase/functions/transfer-coins',
          ]}
        />
      ) : null}
    </PhoneFrame>
  )
}
