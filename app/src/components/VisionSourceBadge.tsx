import { visionProofSourceLabel } from '../lib/visionProofBridge'
import { isWebVisionEnabled } from '../lib/visionEngine'

type Props = {
  className?: string
}

export function VisionSourceBadge({ className }: Props) {
  if (!isWebVisionEnabled()) return null
  const source = visionProofSourceLabel()
  return (
    <span
      className={className ?? 'profile-trust-card__hint mono'}
      style={{ fontSize: 11, display: 'inline-block' }}
    >
      Proof gaze source: {source === 'web-vision' ? 'web vision (hints)' : 'mock'}
    </span>
  )
}
