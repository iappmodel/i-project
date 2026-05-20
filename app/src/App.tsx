import type { ReactElement } from 'react'
import { AppShell } from './components/AppShell'
import { DemoProvider } from './state/demoContext'
import { useDemo } from './state/useDemo'
import type { DemoScreenId } from './state/types'
import { ConvertScreen } from './screens/ConvertScreen'
import { CreatorEconomicsScreen } from './screens/CreatorEconomicsScreen'
import { FeedScreen } from './screens/FeedScreen'
import { ConsentCameraGateScreen } from './screens/ConsentCameraGateScreen'
import { OfferDetailScreen } from './screens/OfferDetailScreen'
import { ProofLayerScreen } from './screens/ProofLayerScreen'
import { RewardRevealScreen } from './screens/RewardRevealScreen'
import { RoadmapScreen } from './screens/RoadmapScreen'
import { SplashScreen } from './screens/SplashScreen'
import { VerificationResultScreen } from './screens/VerificationResultScreen'
import { WalletScreen } from './screens/WalletScreen'
import { WatchVerifyScreen } from './screens/WatchVerifyScreen'
import { WithdrawPreviewScreen } from './screens/WithdrawPreviewScreen'

function ScreenRouter() {
  const { currentScreen } = useDemo()

  const table: Record<DemoScreenId, ReactElement> = {
    splash: <SplashScreen />,
    feed: <FeedScreen />,
    'offer-detail': <OfferDetailScreen />,
    'consent-camera-gate': <ConsentCameraGateScreen />,
    'watch-verify': <WatchVerifyScreen />,
    'verification-result': <VerificationResultScreen />,
    'reward-reveal': <RewardRevealScreen />,
    wallet: <WalletScreen />,
    convert: <ConvertScreen />,
    'withdraw-preview': <WithdrawPreviewScreen />,
    'creator-economics': <CreatorEconomicsScreen />,
    'proof-layer': <ProofLayerScreen />,
    roadmap: <RoadmapScreen />,
  }

  return <div className="screen-host">{table[currentScreen]}</div>
}

export default function App() {
  return (
    <DemoProvider>
      <AppShell>
        <ScreenRouter />
      </AppShell>
    </DemoProvider>
  )
}
