import type { OfferSession } from '../../lib/gestureButtons/types'
import { RewardOfferPill } from '../gestureButtons/RewardOfferPill'

type Props = {
  balanceIc?: number
  offer: OfferSession | null
  onEdit?: () => void
  onCancel?: () => void
  onConfirm?: () => void
}

/** Top-right REWARD — static `50ic` or active offer review */
export function ImmersiveRewardBadge({
  balanceIc = 50,
  offer,
  onEdit,
  onCancel,
  onConfirm,
}: Props) {
  if (offer) {
    return (
      <RewardOfferPill
        offer={offer}
        onEdit={onEdit}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    )
  }

  return (
    <div className="immersive-reward-badge" role="status" aria-label="Reward balance">
      <span className="immersive-reward-badge__val mono">{balanceIc}ic</span>
    </div>
  )
}
