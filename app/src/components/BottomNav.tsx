type Tab = 'feed' | 'discover' | 'wallet'

type Props = {
  active: Tab
  onFeed: () => void
  onDiscover: () => void
  onWallet: () => void
}

export function BottomNav({ active, onFeed, onDiscover, onWallet }: Props) {
  return (
    <nav className="ds-bottom-nav tab-bar tab-bar--feed">
      <button
        type="button"
        className={`ds-bottom-nav__tab tab ${active === 'feed' ? 'ds-bottom-nav__tab--active active' : ''}`}
        onClick={onFeed}
      >
        Feed
        {active === 'feed' && <span className="ds-bottom-nav__pip tab-pip" />}
      </button>
      <button
        type="button"
        className={`ds-bottom-nav__tab tab ${active === 'discover' ? 'ds-bottom-nav__tab--active active' : ''}`}
        onClick={onDiscover}
      >
        Discover
      </button>
      <button
        type="button"
        className={`ds-bottom-nav__tab tab ${active === 'wallet' ? 'ds-bottom-nav__tab--active active' : ''}`}
        onClick={onWallet}
      >
        Wallet
      </button>
    </nav>
  )
}
