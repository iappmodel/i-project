import type { ProductTabId } from '../state/types'

type ImmersiveTab = 'feed' | 'promo' | 'create' | 'wallet' | 'profile'

type Props = {
  active: ImmersiveTab
  onFeed: () => void
  onPromo: () => void
  onCreate: () => void
  onWallet: () => void
  onProfile: () => void
}

function NavIcon({ kind }: { kind: ImmersiveTab | 'create' }) {
  const stroke = 'currentColor'
  const common = { fill: 'none', stroke, strokeWidth: 1.4, strokeLinecap: 'round' as const }
  switch (kind) {
    case 'feed':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path {...common} d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" />
        </svg>
      )
    case 'promo':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <path {...common} d="M12 21s-7-5.35-7-11a7 7 0 0114 0c0 5.65-7 11-7 11z" />
          <circle cx="12" cy="10" r="2" fill={stroke} stroke="none" />
        </svg>
      )
    case 'create':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <path {...common} d="M12 5v14M5 12h14" />
        </svg>
      )
    case 'wallet':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <rect {...common} x="4" y="7" width="16" height="12" rx="2" />
          <path {...common} d="M8 7V6a2 2 0 012-2h4a2 2 0 012 2v1" />
        </svg>
      )
    case 'profile':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <circle {...common} cx="12" cy="8" r="3.5" />
          <path {...common} d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
      )
  }
}

const TABS: { id: ImmersiveTab; label: string; key: keyof Props }[] = [
  { id: 'feed', label: 'Feed', key: 'onFeed' },
  { id: 'promo', label: 'Promo', key: 'onPromo' },
  { id: 'create', label: 'Create', key: 'onCreate' },
  { id: 'wallet', label: 'Wallet', key: 'onWallet' },
  { id: 'profile', label: 'Profile', key: 'onProfile' },
]

export function ImmersiveBottomNav(props: Props) {
  return (
    <nav className="immersive-bottom-nav" aria-label="Main navigation">
      {TABS.map((tab) => {
        if (tab.id === 'create') {
          return (
            <button
              key={tab.id}
              type="button"
              className="immersive-bottom-nav__create"
              aria-label={tab.label}
              onClick={props.onCreate}
            >
              <NavIcon kind="create" />
            </button>
          )
        }
        const active = props.active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            className={`immersive-bottom-nav__tab ${active ? 'immersive-bottom-nav__tab--active' : ''}`}
            aria-label={tab.label}
            aria-current={active ? 'page' : undefined}
            onClick={props[tab.key] as () => void}
          >
            <NavIcon kind={tab.id} />
          </button>
        )
      })}
    </nav>
  )
}

export type { ImmersiveTab }

/** Map legacy 4-tab state to immersive highlight */
export function immersiveTabFromProduct(tab: ProductTabId): ImmersiveTab {
  if (tab === 'earn') return 'promo'
  return tab
}
