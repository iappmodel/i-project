type Props = {
  percent: number
  className?: string
}

export function ProgressBar({ percent, className = '' }: Props) {
  const clamped = Math.min(100, Math.max(0, percent))
  return (
    <div className={`ds-progress watch-earn-bar-prot ${className}`.trim()}>
      <div className="ds-progress__fill web-fill-prot" style={{ width: `${clamped}%` }} />
    </div>
  )
}
