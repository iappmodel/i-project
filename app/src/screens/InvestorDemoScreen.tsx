/* ─── [ i ] Investor Demo Screen ─────────────────────────────────────────────
 * Self-contained route. Owns its own state. No Supabase, no real wallets,
 * no camera access. All data is mocked, deterministic, and local.
 * ─────────────────────────────────────────────────────────────────────────── */

import '../demo/styles/investorDemo.css'

import {
  InvestorDemoContext,
  useInvestorDemo,
  useInvestorDemoState,
  type InvestorDemoActions,
} from '../demo/useInvestorDemoState'
import { InvestorPhoneShell } from '../demo/components/InvestorPhoneShell'
import { InvestorPresenterPanel } from '../demo/components/InvestorPresenterPanel'
import { InvestorSplashView } from '../demo/screens/InvestorSplashView'
import { InvestorFeedView } from '../demo/screens/InvestorFeedView'
import { InvestorOfferDetailView } from '../demo/screens/InvestorOfferDetailView'
import { InvestorWatchVerifyView } from '../demo/screens/InvestorWatchVerifyView'
import { InvestorRewardRevealView } from '../demo/screens/InvestorRewardRevealView'
import { InvestorWalletView } from '../demo/screens/InvestorWalletView'
import { InvestorConvertView } from '../demo/screens/InvestorConvertView'
import { InvestorTipView } from '../demo/screens/InvestorTipView'
import { InvestorConnectPlatformsView } from '../demo/screens/InvestorConnectPlatformsView'
import { InvestorCampaignPreviewView } from '../demo/screens/InvestorCampaignPreviewView'
import { InvestorPayView } from '../demo/screens/InvestorPayView'
import { InvestorWithdrawView } from '../demo/screens/InvestorWithdrawView'
import { InvestorPromoView } from '../demo/screens/InvestorPromoView'
import { InvestorStudioPreviewView } from '../demo/screens/InvestorStudioPreviewView'
import type { InvestorView } from '../demo/investorDemoData'

// ─── View router (reads from context) ─────────────────────────────────────

function ViewRouter() {
  const { state } = useInvestorDemo()
  return <ViewSwitch view={state.currentView} />
}

function ViewSwitch({ view }: { view: InvestorView }) {
  switch (view) {
    case 'feed':
      return <InvestorFeedView />
    case 'offerDetail':
      return <InvestorOfferDetailView />
    case 'watchVerify':
      return <InvestorWatchVerifyView />
    case 'reward':
      return <InvestorRewardRevealView />
    case 'wallet':
      return <InvestorWalletView />
    case 'convert':
      return <InvestorConvertView />
    case 'tip':
      return <InvestorTipView />
    case 'pay':
      return <InvestorPayView />
    case 'withdraw':
      return <InvestorWithdrawView />
    case 'promo':
      return <InvestorPromoView />
    case 'connectPlatforms':
      return <InvestorConnectPlatformsView />
    case 'campaignPreview':
      return <InvestorCampaignPreviewView />
    case 'studioPreview':
      return <InvestorStudioPreviewView />
    case 'splash':
    default:
      return <InvestorSplashView />
  }
}

// ─── Root — creates state once, provides via context ──────────────────────

export function InvestorDemoScreen() {
  const demo: InvestorDemoActions = useInvestorDemoState()

  return (
    <InvestorDemoContext.Provider value={demo}>
      <div className="id-root" role="main">
        {/* Watermark */}
        <p className="id-demo-label" aria-hidden>
          Investor Demo · Simulated · No real value
        </p>

        <div className="id-layout">
          {/* Phone shell wraps the current view */}
          <InvestorPhoneShell>
            <ViewRouter />
          </InvestorPhoneShell>

          {/* Desktop-only presenter panel */}
          <InvestorPresenterPanel />
        </div>
      </div>
    </InvestorDemoContext.Provider>
  )
}
