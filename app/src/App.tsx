import type { ReactElement } from 'react'
import { AppShell } from './components/AppShell'
import { VisionProvider } from './contexts/VisionContext'
import { VisionStreamProvider } from './contexts/VisionStreamContext'
import { VisionTargetOverlay } from './components/VisionTargetOverlay'
import { GestureComboMatcherHost } from './components/GestureComboMatcherHost'
import { AccessibilityProvider } from './contexts/AccessibilityContext'
import { DemoProvider } from './state/demoContext'
import { EloSessionScope } from './components/elo/EloSessionScope'
import { EloProvider } from './state/eloContext'
import { useDemo } from './state/useDemo'
import type { DemoScreenId } from './state/types'
import { ConvertScreen } from './screens/ConvertScreen'
import { CreatorEconomicsScreen } from './screens/CreatorEconomicsScreen'
import { EarnScreen } from './screens/EarnScreen'
import { FeedScreen } from './screens/FeedScreen'
import { ImmersiveFeedScreen } from './screens/ImmersiveFeedScreen'
import { ImmersivePromoScreen } from './screens/ImmersivePromoScreen'
import { ImmersiveCreateScreen } from './screens/ImmersiveCreateScreen'
import { ImmersiveStudioScreen } from './screens/ImmersiveStudioScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ConsentCameraGateScreen } from './screens/ConsentCameraGateScreen'
import { OfferDetailScreen } from './screens/OfferDetailScreen'
import { ProofLayerScreen } from './screens/ProofLayerScreen'
import { RewardRevealScreen } from './screens/RewardRevealScreen'
import { RoadmapScreen } from './screens/RoadmapScreen'
import { SavedScreen } from './screens/SavedScreen'
import { SplashScreen } from './screens/SplashScreen'
import { VerificationResultScreen } from './screens/VerificationResultScreen'
import { WalletScreen } from './screens/WalletScreen'
import { WatchVerifyScreen } from './screens/WatchVerifyScreen'
import { WithdrawPreviewScreen } from './screens/WithdrawPreviewScreen'
import { InvestorDemoScreen } from './screens/InvestorDemoScreen'

function ScreenRouter() {
  const { currentScreen } = useDemo()

  const table: Record<DemoScreenId, ReactElement> = {
    'investor-demo': <InvestorDemoScreen />,
    splash: <SplashScreen />,
    feed: <FeedScreen />,
    'immersive-feed': <ImmersiveFeedScreen />,
    'immersive-promo': <ImmersivePromoScreen />,
    'immersive-create': <ImmersiveCreateScreen />,
    'immersive-studio': <ImmersiveStudioScreen />,
    earn: <EarnScreen />,
    profile: <ProfileScreen />,
    'offer-detail': <OfferDetailScreen />,
    'consent-camera-gate': <ConsentCameraGateScreen />,
    'watch-verify': <WatchVerifyScreen />,
    'verification-result': <VerificationResultScreen />,
    'reward-reveal': <RewardRevealScreen />,
    wallet: <WalletScreen />,
    saved: <SavedScreen />,
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
      <EloProvider>
        <EloSessionScope />
        <AccessibilityProvider>
          <VisionStreamProvider>
            <VisionProvider>
              <VisionTargetOverlay />
              <GestureComboMatcherHost />
              <AppShell>
                <ScreenRouter />
              </AppShell>
            </VisionProvider>
          </VisionStreamProvider>
        </AccessibilityProvider>
      </EloProvider>
    </DemoProvider>
  )
}
