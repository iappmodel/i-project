import { useCallback, useMemo, useState } from 'react'
import { Button } from '../Button'
import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { listCheckoutScenarios, previewCheckoutQuote } from '../../services/merchantCheckout.service'

type Props = {
  open: boolean
  onClose: () => void
  onToast?: (msg: string) => void
}

export function ImmersivePaySheet({ open, onClose, onToast }: Props) {
  const scenarios = useMemo(() => listCheckoutScenarios().slice(0, 6), [])
  const [selectedId, setSelectedId] = useState(scenarios[0]?.id ?? '')
  const [amount, setAmount] = useState(2500)

  const quote = useMemo(
    () => (selectedId ? previewCheckoutQuote(selectedId, amount) : null),
    [amount, selectedId],
  )

  const handlePay = useCallback(() => {
    onToast?.(`Paid ${quote?.quote.totalMinor ?? amount} minor units (demo)`)
    onClose()
  }, [amount, onClose, onToast, quote?.quote.totalMinor])

  return (
    <ImmersiveGlassSheet open={open} title="Pay" onClose={onClose}>
      <div className="pay-sheet">
        <div className="pay-sheet__modes" aria-label="Payment modes">
          <span className="pay-sheet__mode">NFC</span>
          <span className="pay-sheet__mode">QR</span>
          <span className="pay-sheet__mode">Link</span>
        </div>
        <label className="pay-sheet__label">
          Scenario
          <select
            className="pay-sheet__select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </label>
        <label className="pay-sheet__label">
          Amount (minor)
          <input
            className="pay-sheet__input mono"
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </label>
        {quote ? (
          <p className="pay-sheet__total mono">
            Total: {(quote.quote.totalMinor / 100).toFixed(2)} · {quote.quote.currencyCode}
          </p>
        ) : null}
        <Button variant="secondary" onClick={handlePay}>
          Confirm pay
        </Button>
      </div>
    </ImmersiveGlassSheet>
  )
}
