import {
  PRODUCT_MAP_GROUPS,
  PRODUCT_MAP_NODES,
  productMapNodeById,
  type ProductMapGroupId,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

function nodesForGroup(group: ProductMapGroupId) {
  return PRODUCT_MAP_NODES.filter((n) => n.group === group)
}

export function InvestorProductMapView() {
  const {
    state,
    goView,
    setPresenterStep,
    selectProductMapNode,
    openPromo,
    openACoins,
    openPOPLive,
    openThreeLoops,
    openCampaignPreview,
    openStudioPreview,
    openUnifiedProfile,
    openCreatorDashboard,
    openBrandDashboard,
    openMoneyMap,
  } = useInvestorDemo()

  const { selectedProductMapNode } = state
  const selected = productMapNodeById(selectedProductMapNode)

  const handleBack = () => {
    setPresenterStep(1)
    goView('feed')
  }

  const routeTo = (view: string) => {
    if (view === 'promo') {
      openPromo()
      return
    }
    if (view === 'acoins') {
      openACoins()
      return
    }
    if (view === 'popLive') {
      openPOPLive()
      return
    }
    if (view === 'threeLoops') {
      openThreeLoops()
      return
    }
    if (view === 'campaignPreview') {
      openCampaignPreview()
      return
    }
    if (view === 'studioPreview') {
      openStudioPreview()
      return
    }
    if (view === 'unifiedProfile') {
      openUnifiedProfile()
      return
    }
    if (view === 'creatorDashboard') {
      openCreatorDashboard()
      return
    }
    if (view === 'brandDashboard') {
      openBrandDashboard()
      return
    }
    if (view === 'moneyMap') {
      openMoneyMap()
      return
    }
    if (view === 'wallet') {
      setPresenterStep(5)
    }
    goView(view as Parameters<typeof goView>[0])
  }

  return (
    <div className="id-productmap">
      <div className="id-productmap__scroll">
        <button type="button" className="id-productmap__back" onClick={handleBack}>
          <span className="id-productmap__back-icon" aria-hidden>←</span>
          Feed
        </button>

        <header className="id-productmap__header">
          <h1 className="id-productmap__title">Product Map</h1>
          <p className="id-productmap__sub">The verified attention economy</p>
        </header>

        <div className="id-productmap__groups">
          {PRODUCT_MAP_GROUPS.map((group) => {
            const nodes = nodesForGroup(group.id)
            if (nodes.length === 0) return null
            return (
              <section key={group.id} className="id-productmap__group">
                <div className="id-productmap__group-head">
                  <span className="id-productmap__group-label">{group.label}</span>
                  <span className="id-productmap__group-sub">{group.sub}</span>
                </div>
                <div className="id-productmap__node-grid">
                  {nodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      className={`id-productmap__node${
                        selectedProductMapNode === node.id ? ' active' : ''
                      }`}
                      onClick={() => selectProductMapNode(node.id)}
                    >
                      <span className="id-productmap__node-label">{node.label}</span>
                      <span className="id-productmap__node-sub">{node.sub}</span>
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        <section className="id-productmap__detail">
          <p className="id-productmap__panel-title">Node explanation</p>
          <div className="id-productmap__detail-card">
            <h2 className="id-productmap__detail-title">{selected.label}</h2>
            <p className="id-productmap__detail-sub">{selected.sub}</p>
            <p className="id-productmap__detail-body">{selected.explanation}</p>
            <div className="id-productmap__route-row">
              {selected.routes.map((route) => (
                <button
                  key={`${selected.id}-${route.label}`}
                  type="button"
                  className="id-productmap__route-btn"
                  onClick={() => routeTo(route.view)}
                >
                  {route.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <p className="id-productmap__disclaimer">
          Product map uses simulated demo flows. No real financial movement or external platform
          access.
        </p>
      </div>
    </div>
  )
}
