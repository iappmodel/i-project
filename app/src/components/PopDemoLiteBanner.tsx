import { isPopDemoLiteEnabled } from '../lib/popDemoLite'
import '../styles/pop-demo-lite.css'

export function PopDemoLiteBanner() {
  if (!isPopDemoLiteEnabled()) return null

  return (
    <div className="pop-demo-lite-banner" role="status" aria-live="polite">
      <div className="pop-demo-lite-banner__pill">
        POP Demo Lite — simulation, not payout authority
      </div>
      <span className="pop-demo-lite-banner__hint">
        Eyes + gestures + voice fused for demo proof only
      </span>
    </div>
  )
}
