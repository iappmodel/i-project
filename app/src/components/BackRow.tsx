type Props = {
  label: string
  onBack: () => void
}

export function BackRow({ label, onBack }: Props) {
  return (
    <button type="button" className="back-row" onClick={onBack}>
      <span className="back-chevron">‹</span>
      <span>{label}</span>
    </button>
  )
}
