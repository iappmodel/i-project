import type { ReactElement } from 'react'
import { PresenterStrip } from './components/PresenterStrip'
import { DemoProvider } from './demo/DemoProvider'
import { useDemo } from './demo/useDemo'
import type { DemoScreenId } from './demo/types'
import { ConvertScreen } from './screens/ConvertScreen'
import { CreatorEconomicsScreen } from './screens/CreatorEconomicsScreen'
import { FeedScreen } from './screens/FeedScreen'
import { OfferDetailScreen } from './screens/OfferDetailScreen'
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
    'watch-verify': <WatchVerifyScreen />,
    'verification-result': <VerificationResultScreen />,
    'reward-reveal': <RewardRevealScreen />,
    wallet: <WalletScreen />,
    convert: <ConvertScreen />,
    'withdraw-preview': <WithdrawPreviewScreen />,
    'creator-economics': <CreatorEconomicsScreen />,
    roadmap: <RoadmapScreen />,
  }

  return <div className="screen-host">{table[currentScreen]}</div>
}

export default function App() {
  return (
    <DemoProvider>
      <div className="demo-app">
        <header className="demo-titlebar">
          <div>
            <p className="demo-kicker mono-muted">Investor MVP</p>
            <p className="demo-title">[ i ] Attention Wallet</p>
          </div>
        </header>
        <ScreenRouter />
        <PresenterStrip />
      </div>
    </DemoProvider>
  )
}
