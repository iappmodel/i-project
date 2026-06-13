import { Button } from '../Button'
import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { isWebVisionEnabled } from '../../lib/visionEngine'
import { useReferral } from '../../hooks/useReferral'
import { useDemo } from '../../state/useDemo'
import { CheckInStreakPill } from './QuickCheckInSheet'

type Props = {
  open: boolean
  onClose: () => void
  onOpenFull?: () => void
  onOpenVision?: () => void
  onOpenTasks?: () => void
  onOpenAchievements?: () => void
  onOpenSpin?: () => void
  onOpenLeaderboard?: () => void
  onOpenMessages?: () => void
  streakDays?: number
}

export function ImmersiveProfileSheet({
  open,
  onClose,
  onOpenFull,
  onOpenVision,
  onOpenTasks,
  onOpenAchievements,
  onOpenSpin,
  onOpenLeaderboard,
  onOpenMessages,
  streakDays = 0,
}: Props) {
  const { authUserEmail, supabaseAuthEnabled, isNativeShell, nativePlatform, startPresenterTour } =
    useDemo()
  const webVision = isWebVisionEnabled()
  const referral = useReferral()

  return (
    <ImmersiveGlassSheet open={open} title="In-Profile" onClose={onClose}>
      {supabaseAuthEnabled && authUserEmail ? (
        <p className="immersive-glass-sheet__hint mono">Signed in · {authUserEmail}</p>
      ) : (
        <p className="immersive-glass-sheet__hint">Demo profile · trust & vision settings</p>
      )}
      <div className="profile-sheet__streak-row">
        <CheckInStreakPill streakDays={streakDays} />
      </div>
      <p className="immersive-glass-sheet__hint mono">
        Referral · {referral.code} · {referral.invites} invites
      </p>
      {isNativeShell ? (
        <p className="immersive-glass-sheet__hint mono">Capacitor · {nativePlatform}</p>
      ) : null}
      <div className="immersive-glass-sheet__actions">
        {onOpenTasks ? (
          <Button variant="secondary" onClick={onOpenTasks}>
            Tasks & rewards
          </Button>
        ) : null}
        {onOpenAchievements ? (
          <Button variant="secondary" onClick={onOpenAchievements}>
            Achievements
          </Button>
        ) : null}
        {onOpenSpin ? (
          <Button variant="secondary" onClick={onOpenSpin}>
            Daily spin
          </Button>
        ) : null}
        {onOpenLeaderboard ? (
          <Button variant="secondary" onClick={onOpenLeaderboard}>
            Leaderboard
          </Button>
        ) : null}
        {onOpenMessages ? (
          <Button variant="secondary" onClick={onOpenMessages}>
            Messages
          </Button>
        ) : null}
        {webVision && onOpenVision ? (
          <Button variant="secondary" onClick={onOpenVision}>
            Vision controls
          </Button>
        ) : null}
        {onOpenFull ? (
          <Button variant="secondary" onClick={onOpenFull}>
            Full profile
          </Button>
        ) : null}
        <Button variant="ghost" onClick={() => startPresenterTour()}>
          Presenter tour
        </Button>
      </div>
    </ImmersiveGlassSheet>
  )
}
