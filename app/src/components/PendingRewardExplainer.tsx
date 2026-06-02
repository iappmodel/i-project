import { explainPendingHold } from '../lib/pendingRewardExplainer'
import type { PopPendingHold } from '../lib/popValidator'

type Props = {
  hold: PopPendingHold
  onReverify?: () => void
}

/** Why a POP hold is pending and when it may release (Stage 8). */
export function PendingRewardExplainer({ hold, onReverify }: Props) {
  const { headline, lines } = explainPendingHold(hold)

  return (
    <div
      className="profile-trust-card"
      style={{
        marginBottom: 10,
        padding: 12,
        borderRadius: 12,
        background: 'rgba(7,7,9,0.45)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{headline}</p>
      <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, lineHeight: 1.45 }}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {hold.holdStatus === 'appeal_pending' && onReverify ? (
        <button
          type="button"
          className="sec-link-wu"
          style={{ marginTop: 8, fontSize: 12 }}
          onClick={onReverify}
        >
          Re-verify attention
        </button>
      ) : null}
    </div>
  )
}
