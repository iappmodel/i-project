import { useCallback } from 'react'
import { Button } from '../Button'
import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { useCheckInStatus } from '../../hooks/useCheckInStatus'

type Props = {
  open: boolean
  promotionId?: string | null
  promotionTitle?: string
  onClose: () => void
  onToast?: (msg: string) => void
}

export function QuickCheckInSheet({ open, promotionId, promotionTitle, onClose, onToast }: Props) {
  const { streakDays, checking, checkIn } = useCheckInStatus()

  const handleCheckIn = useCallback(async () => {
    const result = await checkIn(promotionId)
    if (result.success) {
      onToast?.(`Checked in · ${result.streakDays ?? streakDays} day streak`)
      onClose()
    } else {
      onToast?.(result.error ?? 'Check-in failed')
    }
  }, [checkIn, onClose, onToast, promotionId, streakDays])

  return (
    <ImmersiveGlassSheet open={open} title="Check in" onClose={onClose}>
      <div className="checkin-sheet">
        {promotionTitle ? <p className="checkin-sheet__promo">{promotionTitle}</p> : null}
        <p className="checkin-sheet__streak mono">
          Streak <strong>{streakDays}</strong> days
        </p>
        <p className="immersive-glass-sheet__hint">Verify location to earn streak bonus on promos.</p>
        <Button variant="secondary" disabled={checking} onClick={() => void handleCheckIn()}>
          {checking ? 'Verifying…' : 'Check in here'}
        </Button>
      </div>
    </ImmersiveGlassSheet>
  )
}

export function CheckInStreakPill({ streakDays }: { streakDays: number }) {
  if (streakDays <= 0) return null
  return (
    <span className="checkin-streak-pill mono" title="Check-in streak">
      🔥 {streakDays}
    </span>
  )
}
