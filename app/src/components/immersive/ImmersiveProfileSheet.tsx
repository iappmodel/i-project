import { Button } from '../Button'
import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { isWebVisionEnabled } from '../../lib/visionEngine'
import { useDemo } from '../../state/useDemo'

type Props = {
  open: boolean
  onClose: () => void
  onOpenFull?: () => void
  onOpenVision?: () => void
}

export function ImmersiveProfileSheet({ open, onClose, onOpenFull, onOpenVision }: Props) {
  const { authUserEmail, supabaseAuthEnabled, isNativeShell, nativePlatform, startPresenterTour } =
    useDemo()
  const webVision = isWebVisionEnabled()

  return (
    <ImmersiveGlassSheet open={open} title="In-Profile" onClose={onClose}>
      {supabaseAuthEnabled && authUserEmail ? (
        <p className="immersive-glass-sheet__hint mono">Signed in · {authUserEmail}</p>
      ) : (
        <p className="immersive-glass-sheet__hint">Demo profile · trust & vision settings</p>
      )}
      {isNativeShell ? (
        <p className="immersive-glass-sheet__hint mono">Capacitor · {nativePlatform}</p>
      ) : null}
      <div className="immersive-glass-sheet__actions">
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
