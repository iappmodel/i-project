type Variant = 'icoin' | 'pending' | 'verify'

type Props = {
  value: string | number
  variant?: Variant
  onClick?: () => void
  label?: string
}

export function CurrencyChip({ value, variant = 'icoin', onClick, label }: Props) {
  return (
    <button
      type="button"
      className={`ds-currency-chip ds-currency-chip--${variant} wallet-chip`}
      onClick={onClick}
      aria-label={label ?? 'Wallet balance'}
    >
      <span className="ds-currency-chip__dot wallet-dot" />
      <span className="wallet-val">{value}</span>
    </button>
  )
}
