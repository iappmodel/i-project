import type { ProductTabId } from '../state/types'

type Props = {
  active: ProductTabId
  onFeed: () => void
  onEarn: () => void
  onWallet: () => void
  onProfile: () => void
}

export function BottomNav({ active, onFeed, onEarn, onWallet, onProfile }: Props) {
  const tabs: { id: ProductTabId; label: string; onClick: () => void }[] = [
    { id: 'feed', label: 'Feed', onClick: onFeed },
    { id: 'earn', label: 'Earn', onClick: onEarn },
    { id: 'wallet', label: 'Wallet', onClick: onWallet },
    { id: 'profile', label: 'Profile', onClick: onProfile },
  ]

  return (
    <nav className="ds-bottom-nav tab-bar tab-bar--four" aria-label="Main navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`ds-bottom-nav__tab tab ${active === tab.id ? 'ds-bottom-nav__tab--active active' : ''}`}
          onClick={tab.onClick}
        >
          {tab.label}
          <span className="ds-bottom-nav__pip tab-pip" />
        </button>
      ))}
    </nav>
  )
}
