import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { useDemo } from '../state/useDemo'

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
        <p className="splash-tag">Attention wallet</p>
        <p className="splash-hint">Tap to continue</p>
      </button>
      <SourceEvidence
        paths={[
          '02_clickable_prototypes/index4.html',
          'integrations/eye-tracking/demos/investor-demo/src/screens/SplashScreen.tsx',
        ]}
      />
    </PhoneFrame>
  )
}
