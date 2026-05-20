import { PhoneFrame } from '../components/PhoneFrame'
import { useDemo } from '../demo/useDemo'

export function SplashScreen() {
  const { setScreen } = useDemo()

  return (
    <PhoneFrame variant="void">
      <button
        type="button"
        className="splash-root"
        onClick={() => setScreen('feed')}
        aria-label="Enter feed"
      >
        <div className="splash-logo" aria-hidden>
          <span>[</span>
          <span className="splash-i">i</span>
          <span>]</span>
        </div>
        <p className="splash-tag">
          Attention wallet
        </p>
        <p className="splash-hint">
          Tap to continue
        </p>
      </button>
    </PhoneFrame>
  )
}
