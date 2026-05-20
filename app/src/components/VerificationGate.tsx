type Props = {
  name: string
  status: string
  passed: boolean
}

export function VerificationGate({ name, status, passed }: Props) {
  return (
    <div className="ds-verification-gate prot-gate-item">
      <div className={`ds-verification-gate__icon prot-gate-icon ${passed ? 'ds-verification-gate__icon--pass pass' : ''}`}>
        {passed ? '✓' : '·'}
      </div>
      <div className="prot-gate-text">
        <div className="ds-verification-gate__name prot-gate-name">{name}</div>
        <div
          className="ds-verification-gate__status prot-gate-status mono"
          style={{ color: passed ? 'var(--icoin-primary)' : 'var(--text-muted)' }}
        >
          {status}
        </div>
      </div>
      <div className="prot-gate-tick" style={{ color: passed ? 'var(--icoin-primary)' : 'var(--text-muted)' }}>
        {passed ? '✓' : '·'}
      </div>
    </div>
  )
}
