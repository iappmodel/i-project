import { useMemo } from 'react'
import {
  MONEY_MAP_NODE_GROUPS,
  MONEY_MAP_NODES,
  MONEY_MAP_TABS,
  computeMoneyMapSnapshot,
  moneyMapNodeById,
  type MoneyMapNodeGroup,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'

function fmt(n: number) {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function nodesForGroup(group: MoneyMapNodeGroup) {
  return MONEY_MAP_NODES.filter((n) => n.group === group)
}

function nodeDetail(nodeId: string, balances: ReturnType<typeof computeMoneyMapSnapshot>['balances']) {
  const node = moneyMapNodeById(nodeId)
  if (!node) return ''

  const extras: string[] = []
  if (nodeId === 'available-wallet') {
    extras.push(`Current verified balance: ${fmt(balances.verified)} iC`)
  }
  if (nodeId === 'usable-balance') {
    extras.push(`Current usable balance: ${fmt(balances.usable)} iC`)
  }
  if (nodeId === 'pending-balance') {
    extras.push(`Current pending preview: ${fmt(balances.pending)} iC`)
  }
  if (nodeId === 'icoins' || nodeId === 'acoins') {
    extras.push(`Lifetime earned preview: ${fmt(balances.lifetime)} iC`)
  }

  return extras.length ? `${node.explanation} ${extras.join(' · ')}` : node.explanation
}

export function InvestorMoneyMapView() {
  const {
    state,
    goView,
    setPresenterStep,
    openACoins,
    openConvert,
    openTip,
    openPay,
    openWithdraw,
    openBrandDashboard,
    openCreatorDashboard,
    setMoneyMapTab,
    selectMoneyNode,
  } = useInvestorDemo()

  const {
    walletBalance,
    usableBalance,
    pendingBalance,
    lifetimeEarned,
    transactions,
    campaign,
    convertConfirmed,
    lastConvertAmount,
    tipConfirmed,
    lastTipAmount,
    payConfirmed,
    lastPayAmount,
    withdrawConfirmed,
    lastWithdrawAmount,
    lastWithdrawFee,
    promoClaimConfirmed,
    lastClaimedPromoId,
    moneyMapTab,
    selectedMoneyNode,
  } = state

  const snapshot = useMemo(
    () =>
      computeMoneyMapSnapshot({
        walletBalance,
        usableBalance,
        pendingBalance,
        lifetimeEarned,
        campaign,
        transactions,
        convertConfirmed,
        lastConvertAmount,
        tipConfirmed,
        lastTipAmount,
        payConfirmed,
        lastPayAmount,
        withdrawConfirmed,
        lastWithdrawAmount,
        lastWithdrawFee,
        promoClaimConfirmed,
        lastClaimedPromoId,
      }),
    [
      walletBalance,
      usableBalance,
      pendingBalance,
      lifetimeEarned,
      campaign,
      transactions,
      convertConfirmed,
      lastConvertAmount,
      tipConfirmed,
      lastTipAmount,
      payConfirmed,
      lastPayAmount,
      withdrawConfirmed,
      lastWithdrawAmount,
      lastWithdrawFee,
      promoClaimConfirmed,
      lastClaimedPromoId,
    ],
  )

  const selectedNode = moneyMapNodeById(selectedMoneyNode)
  const explanation = nodeDetail(selectedMoneyNode, snapshot.balances)

  const handleBack = () => {
    setPresenterStep(5)
    goView('wallet')
  }

  const openWallet = () => {
    setPresenterStep(5)
    goView('wallet')
  }

  return (
    <div className="id-moneymap">
      <div className="id-moneymap__scroll">
        <button type="button" className="id-moneymap__back" onClick={handleBack}>
          <span className="id-moneymap__back-icon" aria-hidden>←</span>
          Wallet
        </button>

        <header className="id-moneymap__header">
          <div className="id-moneymap__mark" aria-hidden>⇄</div>
          <div>
            <h1 className="id-moneymap__title">Money Movement</h1>
            <p className="id-moneymap__sub">How verified value routes through [ i ]</p>
          </div>
        </header>

        <p className="id-moneymap__flow-hint">{snapshot.flowSummary}</p>

        <div className="id-moneymap__balance-strip">
          <div className="id-moneymap__balance-cell">
            <span className="id-moneymap__balance-key">Verified</span>
            <span className="id-moneymap__balance-val mono">{fmt(snapshot.balances.verified)}</span>
          </div>
          <div className="id-moneymap__balance-cell">
            <span className="id-moneymap__balance-key">Usable</span>
            <span className="id-moneymap__balance-val mono">{fmt(snapshot.balances.usable)}</span>
          </div>
          <div className="id-moneymap__balance-cell">
            <span className="id-moneymap__balance-key">Pending</span>
            <span className="id-moneymap__balance-val mono">{fmt(snapshot.balances.pending)}</span>
          </div>
        </div>

        <div className="id-moneymap__tabs">
          {MONEY_MAP_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`id-moneymap__tab${moneyMapTab === tab.id ? ' active' : ''}`}
              onClick={() => setMoneyMapTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {moneyMapTab === 'map' ? (
          <>
            <div className="id-moneymap__diagram">
              {MONEY_MAP_NODE_GROUPS.map((group, groupIndex) => (
                <div key={group.id} className="id-moneymap__layer">
                  {groupIndex > 0 ? (
                    <div className="id-moneymap__connector" aria-hidden>
                      <span className="id-moneymap__connector-line" />
                      <span className="id-moneymap__connector-arrow">↓</span>
                    </div>
                  ) : null}
                  <p className="id-moneymap__layer-label">{group.label}</p>
                  <div
                    className={`id-moneymap__node-grid${
                      group.id === 'verification' ? ' cols-2' : ''
                    }`}
                  >
                    {nodesForGroup(group.id).map((node) => {
                      const active = selectedMoneyNode === node.id
                      return (
                        <button
                          key={node.id}
                          type="button"
                          className={`id-moneymap__node${active ? ' active' : ''}`}
                          onClick={() => selectMoneyNode(node.id)}
                        >
                          <span
                            className="id-moneymap__node-icon"
                            style={{
                              background: `${node.color}18`,
                              color: node.color,
                              borderColor: `${node.color}44`,
                            }}
                            aria-hidden
                          >
                            {node.icon}
                          </span>
                          <span className="id-moneymap__node-label">{node.short}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <section className="id-moneymap__panel">
              <p className="id-moneymap__panel-title">
                {selectedNode ? selectedNode.label : 'Select a node'}
              </p>
              <p className="id-moneymap__panel-body">{explanation}</p>
            </section>
          </>
        ) : null}

        {moneyMapTab === 'states' ? (
          <section className="id-moneymap__panel">
            <p className="id-moneymap__panel-title">Wallet routing states · preview</p>
            <div className="id-moneymap__state-list">
              {snapshot.states.map((row) => (
                <div key={row.id} className={`id-moneymap__state-row ${row.tone}`}>
                  <span className="id-moneymap__state-dot" aria-hidden />
                  <div className="id-moneymap__state-text">
                    <span className="id-moneymap__state-label">{row.label}</span>
                    <span className="id-moneymap__state-sub">{row.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {moneyMapTab === 'fees' ? (
          <section className="id-moneymap__panel">
            <p className="id-moneymap__panel-title">Fee preview · simulated</p>
            <div className="id-moneymap__fee-list">
              {snapshot.fees.map((fee) => (
                <div key={fee.id} className="id-moneymap__fee-row">
                  <div className="id-moneymap__fee-text">
                    <span className="id-moneymap__fee-label">{fee.label}</span>
                    <span className="id-moneymap__fee-sub">{fee.sub}</span>
                  </div>
                  <span className="id-moneymap__fee-amt mono">{fee.amount}</span>
                </div>
              ))}
            </div>
            <p className="id-moneymap__panel-note">
              Campaign reward {fmt(snapshot.campaignReward)} iC · {snapshot.campaignStatusLabel}
            </p>
          </section>
        ) : null}

        {moneyMapTab === 'receipts' ? (
          <section className="id-moneymap__panel">
            <p className="id-moneymap__panel-title">Receipt previews · simulated IDs</p>
            <div className="id-moneymap__receipt-list">
              {snapshot.receipts.map((receipt) => (
                <div key={receipt.id} className="id-moneymap__receipt-card">
                  <div className="id-moneymap__receipt-top">
                    <span className="id-moneymap__receipt-type">{receipt.type}</span>
                    <span className="id-moneymap__receipt-status">{receipt.status}</span>
                  </div>
                  <p className="id-moneymap__receipt-id mono">{receipt.txId}</p>
                  <div className="id-moneymap__receipt-bottom">
                    <span className="id-moneymap__receipt-detail">{receipt.detail}</span>
                    <span className="id-moneymap__receipt-amt mono">{receipt.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="id-moneymap__routes">
          <p className="id-moneymap__panel-title">Open related previews</p>
          <div className="id-moneymap__route-row">
            <button type="button" className="id-moneymap__route-btn" onClick={openACoins}>
              ACoins
            </button>
            <button type="button" className="id-moneymap__route-btn" onClick={openWallet}>
              Wallet
            </button>
          </div>
          <div className="id-moneymap__route-row">
            <button type="button" className="id-moneymap__route-btn" onClick={openConvert}>
              Convert
            </button>
            <button type="button" className="id-moneymap__route-btn" onClick={openTip}>
              Tip
            </button>
          </div>
          <div className="id-moneymap__route-row">
            <button type="button" className="id-moneymap__route-btn" onClick={openPay}>
              Pay
            </button>
            <button type="button" className="id-moneymap__route-btn" onClick={openWithdraw}>
              Withdraw
            </button>
          </div>
          <div className="id-moneymap__route-row">
            <button type="button" className="id-moneymap__route-btn" onClick={openBrandDashboard}>
              Brand Dashboard
            </button>
            <button type="button" className="id-moneymap__route-btn" onClick={openCreatorDashboard}>
              Creator Dashboard
            </button>
          </div>
        </section>

        <p className="id-moneymap__disclaimer">
          Simulated architecture map. No real banking, settlement, or financial movement.
        </p>
      </div>
    </div>
  )
}
