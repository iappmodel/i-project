import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { useDemo } from '../state/useDemo'

export function SplashScreen() {
  const { appMode, enterProduct, setScreen, startPresenterTour } = useDemo()

  const handleEnter = () => {
    if (appMode === 'presenter') {
      setScreen('feed')
      return
    }
    enterProduct()
  }

  return (
    <PhoneFrame variant="void">
      <button type="button" className="splash-root" onClick={handleEnter} aria-label="Enter app">
        <div className="splash-logo" aria-hidden>
          <span>[</span>
          <span className="splash-i">i</span>
          <span>]</span>
        </div>
        <p className="splash-tag">Media · attention · rewards</p>
        <p className="splash-hint">
          {appMode === 'presenter' ? 'Tap to start presenter walkthrough' : 'Tap to open immersive feed'}
        </p>
      </button>
      {appMode === 'product' ? (
        <button type="button" className="splash-presenter-link" onClick={() => startPresenterTour()}>
          Investor presenter walkthrough
        </button>
      ) : null}
      {appMode === 'presenter' ? (
        <SourceEvidence
          paths={[
            '02_clickable_prototypes/index4.html',
            'MASTER_BRAIN/DECISIONS/DEMO_IA_ADR.md',
            'integrations/eye-tracking/demos/investor-demo/src/screens/SplashScreen.tsx',
          ]}
        />
      ) : null}
    </PhoneFrame>
  )
}
