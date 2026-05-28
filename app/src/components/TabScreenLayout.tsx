import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'
import { PhoneFrame } from './PhoneFrame'
import { SourceEvidence } from './SourceEvidence'
import type { ProductTabId } from '../state/types'
import { useDemo } from '../state/useDemo'

type Props = {
  activeTab: ProductTabId
  children: ReactNode
  evidence?: string[]
}

export function TabScreenLayout({ activeTab, children, evidence }: Props) {
  const { setActiveTab, appMode } = useDemo()
  const showEvidence = appMode === 'presenter' && evidence?.length

  return (
    <PhoneFrame scroll>
      <div className="product-tab-layout product-tab-layout--legacy">
        <p className="product-tab-layout__legacy-banner">
          Legacy shell — open immersive feed for canonical UI
        </p>
        <div className="product-tab-layout__body">{children}</div>
        <BottomNav
          active={activeTab}
          onFeed={() => setActiveTab('feed')}
          onEarn={() => setActiveTab('earn')}
          onWallet={() => setActiveTab('wallet')}
          onProfile={() => setActiveTab('profile')}
        />
      </div>
      {showEvidence ? <SourceEvidence paths={evidence} /> : null}
    </PhoneFrame>
  )
}
