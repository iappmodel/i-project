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
  splash: 'feed',
}

export function InvestorDock() {
  const { state, goView, showToast } = useInvestorDemo()

  const activeTab = VIEW_TO_TAB[state.currentView] ?? 'feed'

  const handleTab = (tab: DockTab) => {
    if (tab === 'feed') {
      goView('feed')
    } else if (tab === 'wallet') {
      goView('wallet')
    } else {
      showToast(`${tab.charAt(0).toUpperCase() + tab.slice(1)} available in full walkthrough`)
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
        >
          <span className="id-dock__icon">{tab.icon}</span>
          <span className="id-dock__label">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}
