import { useInvestorDemo } from '../useInvestorDemoState'

type DockTab = 'feed' | 'promo' | 'create' | 'wallet' | 'profile'

const TABS: { id: DockTab; icon: string; label: string }[] = [
  { id: 'feed', icon: '▶', label: 'Feed' },
  { id: 'promo', icon: '◈', label: 'Promo' },
  { id: 'create', icon: '+', label: 'Create' },
  { id: 'wallet', icon: '◎', label: 'Wallet' },
  { id: 'profile', icon: '○', label: 'Profile' },
]

const VIEW_TO_TAB: Record<string, DockTab> = {
  feed: 'feed',
  offerDetail: 'feed',
  watchVerify: 'feed',
  reward: 'feed',
  wallet: 'wallet',
  convert: 'wallet',
  tip: 'wallet',
  pay: 'wallet',
  withdraw: 'wallet',
  promo: 'promo',
  connectPlatforms: 'profile',
  campaignPreview: 'create',
  splash: 'feed',
}

export function InvestorDock() {
  const {
    state,
    goView,
    setPresenterStep,
    openConnectPlatforms,
    openCampaignPreview,
    openPromo,
  } = useInvestorDemo()

  const activeTab = VIEW_TO_TAB[state.currentView] ?? 'feed'

  const handleTab = (tab: DockTab) => {
    if (tab === 'feed') {
      setPresenterStep(1)
      goView('feed')
    } else if (tab === 'wallet') {
      setPresenterStep(5)
      goView('wallet')
    } else if (tab === 'profile') {
      openConnectPlatforms()
    } else if (tab === 'create') {
      openCampaignPreview()
    } else if (tab === 'promo') {
      openPromo()
    }
  }

  return (
    <div className="id-dock">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`id-dock__tab${activeTab === tab.id ? ' active' : ''}`}
          onClick={() => handleTab(tab.id)}
          aria-label={tab.label}
          aria-current={activeTab === tab.id ? 'page' : undefined}
        >
          <span className="id-dock__icon">{tab.icon}</span>
          <span className="id-dock__label">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
