import { useMemo, useState } from 'react'
import { useInvestorDemo } from '../useInvestorDemoState'
import { InvestorDock } from '../components/InvestorDock'

export function InvestorConnectPlatformsView() {
  const { state, goView, togglePlatform, showToast } = useInvestorDemo()
  const { platformConnections } = state

  const [syncingId, setSyncingId] = useState<string | null>(null)

  const connectedCount = useMemo(
    () => platformConnections.filter((p) => p.connected).length,
    [platformConnections],
  )

  const handleBack = () => {
    goView('feed')
  }

  const handleToggle = (platformId: string) => {
    togglePlatform(platformId)
  }

  const runSimulatedAction = (platformId: string, action: 'sync' | 'import') => {
    const platform = platformConnections.find((p) => p.id === platformId)
    if (!platform?.connected) {
      showToast('Connect platform first')
      return
    }
    setSyncingId(platformId)
    setTimeout(() => {
      setSyncingId(null)
      showToast(
        action === 'sync'
          ? `${platform.name} profile synced · simulated`
          : `${platform.name} import queued · simulated`,
      )
    }, 900)
  }

  return (
    <div className="id-connect">
      <div className="id-connect__scroll">
        <button type="button" className="id-connect__back" onClick={handleBack}>
          <span className="id-connect__back-icon" aria-hidden>←</span>
          Feed
        </button>

        <h1 className="id-connect__title">Connect Platforms</h1>
        <p className="id-connect__sub">
          One profile across platforms — unify your creator identity in [ i ].
        </p>

        <div className="id-connect__strip">
          <span className="id-connect__strip-dot" aria-hidden />
          <span className="id-connect__strip-text">
            {connectedCount > 0
              ? `${connectedCount} platform${connectedCount === 1 ? '' : 's'} linked`
              : 'No platforms linked yet'}
          </span>
          <span className="id-connect__strip-count mono">{connectedCount}/4</span>
        </div>

        <p className="id-connect__sec-label">Your platforms</p>
        <div className="id-connect__list">
          {platformConnections.map((platform) => {
            const isSyncing = syncingId === platform.id
            return (
              <div
                key={platform.id}
                className={`id-connect__row${platform.connected ? ' connected' : ''}${isSyncing ? ' syncing' : ''}`}
              >
                <div
                  className="id-connect__icon"
                  style={{ background: platform.color }}
                  aria-hidden
                >
                  {platform.initials}
                </div>
                <div className="id-connect__info">
                  <p className="id-connect__name">{platform.name}</p>
                  <p
                    className={`id-connect__detail${platform.connected ? ' connected' : ''}${isSyncing ? ' syncing' : ''}`}
                  >
                    {isSyncing
                      ? 'Syncing profile…'
                      : platform.connected
                        ? `${platform.handle} · ${platform.contentCount} items`
                        : 'Not connected'}
                  </p>
                </div>
                <button
                  type="button"
                  className={`id-connect__toggle${platform.connected ? ' on' : ''}`}
                  onClick={() => handleToggle(platform.id)}
                  aria-label={platform.connected ? `Disconnect ${platform.name}` : `Connect ${platform.name}`}
                  aria-pressed={platform.connected}
                >
                  <span className="id-connect__toggle-thumb" aria-hidden />
                </button>
              </div>
            )
          })}
        </div>

        <p className="id-connect__sec-label">Profile actions</p>
        <div className="id-connect__actions">
          <button
            type="button"
            className="id-connect__action-btn"
            onClick={() => {
              const first = platformConnections.find((p) => p.connected)
              if (first) runSimulatedAction(first.id, 'sync')
              else showToast('Connect a platform first')
            }}
          >
            <span className="id-connect__action-icon" aria-hidden>↻</span>
            Sync profile
          </button>
          <button
            type="button"
            className="id-connect__action-btn"
            onClick={() => {
              const first = platformConnections.find((p) => p.connected)
              if (first) runSimulatedAction(first.id, 'import')
              else showToast('Connect a platform first')
            }}
          >
            <span className="id-connect__action-icon" aria-hidden>↓</span>
            Import content
          </button>
        </div>

        <div className="id-connect__unify">
          <p className="id-connect__unify-title">Profile unification</p>
          <p className="id-connect__unify-body">
            Link platforms once. [ i ] maps your identity across feeds, rewards,
            and creator tools — without re-entering profile data.
          </p>
        </div>

        <p className="id-connect__disclaimer">
          Simulated platform connection. No external account access.
        </p>
      </div>

      <InvestorDock />
    </div>
  )
}
