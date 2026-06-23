import { useMemo } from 'react'
import {
  computeUnifiedProfileStats,
  filterUnifiedProfileContent,
  isProfileContentLocked,
  PROFILE_PLATFORM_FILTERS,
  profilePlatformMeta,
  UNIFIED_PROFILE_CONTENT,
  UNIFIED_PROFILE_CREATOR,
} from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'
import { InvestorDock } from '../components/InvestorDock'

export function InvestorUnifiedProfileView() {
  const {
    state,
    goView,
    openTip,
    openCampaignPreview,
    openStudioPreview,
    setProfilePlatformFilter,
    selectProfileContent,
  } = useInvestorDemo()

  const {
    platformConnections,
    selectedProfilePlatformFilter,
    selectedProfileContentId,
  } = state

  const creator = UNIFIED_PROFILE_CREATOR

  const stats = useMemo(
    () => computeUnifiedProfileStats(platformConnections, UNIFIED_PROFILE_CONTENT),
    [platformConnections],
  )

  const filteredContent = useMemo(
    () => filterUnifiedProfileContent(UNIFIED_PROFILE_CONTENT, selectedProfilePlatformFilter),
    [selectedProfilePlatformFilter],
  )

  const handleBack = () => goView('connectPlatforms')

  const handleCardTap = (contentId: string, locked: boolean) => {
    if (locked) return
    selectProfileContent(selectedProfileContentId === contentId ? null : contentId)
  }

  return (
    <div className="id-profile">
      <div className="id-profile__scroll">
        <button type="button" className="id-profile__back" onClick={handleBack}>
          <span className="id-profile__back-icon" aria-hidden>←</span>
          Connect Platforms
        </button>

        <header className="id-profile__header">
          <div
            className="id-profile__avatar"
            style={{ background: `${creator.color}22`, color: creator.color }}
            aria-hidden
          >
            {creator.initials}
          </div>
          <h1 className="id-profile__name">{creator.name}</h1>
          <p className="id-profile__handle">{creator.handle}</p>
          <p className="id-profile__bio">{creator.bio}</p>

          <div className="id-profile__stats">
            <div className="id-profile__stat">
              <span className="id-profile__stat-val">{stats.connectedCount}</span>
              <span className="id-profile__stat-key">Platforms</span>
            </div>
            <div className="id-profile__stat">
              <span className="id-profile__stat-val">{stats.importedPosts}</span>
              <span className="id-profile__stat-key">Imported</span>
            </div>
            <div className="id-profile__stat">
              <span className="id-profile__stat-val mono">{stats.attentionValue.toFixed(2)}</span>
              <span className="id-profile__stat-key">Est. iC value</span>
            </div>
          </div>

          <div className="id-profile__actions">
            <button type="button" className="id-profile__action" onClick={openTip}>
              <span aria-hidden>♥</span> Tip
            </button>
            <button type="button" className="id-profile__action" onClick={openCampaignPreview}>
              <span aria-hidden>◈</span> Campaign
            </button>
            <button type="button" className="id-profile__action" onClick={openStudioPreview}>
              <span aria-hidden>✦</span> Studio
            </button>
          </div>
        </header>

        <div className="id-profile__filters">
          {PROFILE_PLATFORM_FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`id-profile__filter${selectedProfilePlatformFilter === tab.id ? ' active' : ''}`}
              onClick={() => setProfilePlatformFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="id-profile__grid">
          {filteredContent.map((item) => {
            const meta = profilePlatformMeta(item.platformId)
            const locked = isProfileContentLocked(item.platformId, platformConnections)
            const selected = selectedProfileContentId === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`id-profile__card${locked ? ' locked' : ''}${selected ? ' selected' : ''}`}
                onClick={() => handleCardTap(item.id, locked)}
                aria-pressed={selected}
                disabled={locked}
              >
                <div
                  className="id-profile__card-thumb"
                  style={{ background: item.gradient }}
                >
                  <span className="id-profile__card-play" aria-hidden>▶</span>
                  <span
                    className="id-profile__card-platform"
                    style={{ background: meta.color }}
                  >
                    {meta.initials}
                  </span>
                  {item.rewardReady && !locked ? (
                    <span className="id-profile__card-reward">+iC</span>
                  ) : null}
                  {locked ? (
                    <span className="id-profile__card-lock" aria-hidden>🔒</span>
                  ) : null}
                </div>
                <p className="id-profile__card-title">{item.title}</p>
                <p className="id-profile__card-views">{item.viewsLabel} views · simulated</p>
              </button>
            )
          })}
        </div>

        {stats.connectedCount === 0 ? (
          <p className="id-profile__empty">
            Connect a platform to unlock imported content previews.
          </p>
        ) : null}

        <p className="id-profile__disclaimer">
          Simulated unified profile. No external account access or real import.
        </p>
      </div>
      <InvestorDock />
    </div>
  )
}
