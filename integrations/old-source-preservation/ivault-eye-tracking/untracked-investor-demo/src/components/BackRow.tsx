type Props = {
  label?: string
  onBack: () => void
}

export function BackRow({ label = 'Back', onBack }: Props) {
  return (
    <button type="button" className="back-row" onClick={onBack}>
      <span className="back-box" aria-hidden>
        ‹
      </span>
      <span className="back-lbl">{label}</span>
    </button>
  )
}
