import { formatIcoinsAmount } from '../demo/format'
import { DEFAULT_SPONSORED_OFFER } from '../demo/mockData'
import { PhoneFrame } from '../components/PhoneFrame'
import { useDemo } from '../demo/useDemo'

export function FeedScreen() {
  const { iCoins, selectOffer, jumpWallet } = useDemo()

  return (
    <PhoneFrame scroll>
      <div className="feed-phone-layout">
        <div className="feed-top-chrome">
          <header className="top-bar">
            <div className="logo-mark">[ i ]</div>
            <div className="top-right">
              <button type="button" className="wallet-chip" onClick={() => jumpWallet()}>
                <span className="wallet-dot" />
                <span className="wallet-val">{iCoins}</span>
              </button>
              <div className="notif-btn" aria-hidden>
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1a4 4 0 00-4 4v3l-1 1.5h10L11 8V5a4 4 0 00-4-4z"
                    stroke="#9997a0"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path d="M5.5 11.5a1.5 1.5 0 003 0" stroke="#9997a0" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <span className="notif-pip" />
              </div>
            </div>
          </header>

          <div className="stories-row">
            {['Add', '@maya', '@jake', '@nora', '@chef', '@alex'].map((name, idx) => (
              <div key={name} className="story">
                <div className="story-wrap">
                  <div className={`story-ring ${idx > 3 ? 'seen' : ''}`}>
                    <div className={`story-avatar story-avatar--${idx}`}>
                      {name.startsWith('@') ? name.slice(1, 3).toUpperCase() : '+'}
                    </div>
                  </div>
                </div>
                <span className="story-name">{name}</span>
              </div>
            ))}
          </div>

          <div className="filter-row">
            {['For you', 'Friends', 'Earn', 'Trending'].map((p, i) => (
              <span key={p} className={`pill ${i === 0 ? 'active' : ''}`}>
                {p}
              </span>
            ))}
          </div>
        </div>

        <section className="feed-list feed-list--main">
          <article className="card">
            <div className="thumb">
              <div
                className="thumb-gradient"
                style={{
                  background: 'linear-gradient(135deg,#1a0533,#0d1533,#0a1a0d)',
                }}
              />
              <div className="thumb-overlay" />
              <div className="thumb-platform-feed">
                <span className="platform-dot-feed platform-dot-feed-tk">TK</span>
                <span className="platform-name-feed">TikTok</span>
              </div>
              <span className="thumb-duration-feed mono">1:24</span>
              <div className="play-btn" aria-hidden>
                <span className="play-triangle" />
              </div>
            </div>
            <div className="card-body">
              <div className="card-header">
                <div className="creator-avatar ca-purple">NK</div>
                <div className="creator-info">
                  <div className="creator-name">Nora Kim</div>
                  <div className="creator-handle">@norakim · TikTok</div>
                </div>
                <div className="verified-badge">✓</div>
              </div>
              <p className="card-caption">
                The ramen recipe you asked for — 3 ingredients, 15 minutes{' '}
                <span className="caption-tags">#food #recipe</span>
              </p>
              <div className="card-stats">
                <span className="stat">
                  <span className="stat-dot stat-dot--v" /> 92k views
                </span>
                <span className="stat">
                  <span className="stat-dot stat-dot--i" /> 4.2k likes
                </span>
                <div className="card-actions" aria-hidden>
                  <button type="button" className="icon-action">
                    ♡
                  </button>
                  <button type="button" className="icon-action">
                    ↗
                  </button>
                  <button type="button" className="icon-action" aria-hidden>
                    ⋯
                  </button>
                </div>
              </div>
            </div>
          </article>

          <button
            type="button"
            className="card sponsored pressable-card"
            onClick={() => selectOffer(DEFAULT_SPONSORED_OFFER)}
          >
            <div className="thumb">
              <div
                className="thumb-gradient"
                style={{ background: DEFAULT_SPONSORED_OFFER.thumbnailGradient }}
              />
              <div className="thumb-overlay" />
              <div className="thumb-platform-feed">
                <span className="platform-dot-feed platform-dot-feed-yt">{DEFAULT_SPONSORED_OFFER.platformCode ?? 'YT'}</span>
                <span className="platform-name-feed">{DEFAULT_SPONSORED_OFFER.platform}</span>
              </div>
              <span className="thumb-duration-feed mono">
                {DEFAULT_SPONSORED_OFFER.watchDuration ?? '4:30'}
              </span>
              <div className="thumb-earn-feed">
                <span className="earn-dot-feed" />
                <span className="earn-val-feed mono">{formatIcoinsAmount(DEFAULT_SPONSORED_OFFER.rewardICoins)}</span>
              </div>
              <div className="play-btn" aria-hidden>
                <span className="play-triangle" />
              </div>
            </div>
            <div className="card-body card-body--sponsored-tail">
              <div className="card-header">
                <div className="creator-avatar ca-yt">NR</div>
                <div className="creator-info">
                  <div className="creator-name">{DEFAULT_SPONSORED_OFFER.brand}</div>
                  <div className="creator-handle">{DEFAULT_SPONSORED_OFFER.creatorHandle ?? 'Brand · Watch to earn'}</div>
                </div>
              </div>
              <p className="card-caption">
                {DEFAULT_SPONSORED_OFFER.title}{' '}
                <span className="caption-tags">{DEFAULT_SPONSORED_OFFER.captionTags ?? ''}</span>
              </p>
              <div className="earn-bar-wrap earn-bar-wrap--feed">
                <div className="earn-bar-fill earn-bar-fill--feed-demo" />
              </div>
              <div className="card-stats card-stats--sponsored-meta">
                <span className="stat stat--sponsored-meta">
                  Watch {DEFAULT_SPONSORED_OFFER.watchDuration ?? '4:30'} · eye-tracking verified
                </span>
                <div className="card-actions" aria-hidden>
                  <button type="button" className="icon-action">
                    ♡
                  </button>
                  <button type="button" className="icon-action">
                    ↗
                  </button>
                </div>
              </div>
            </div>
          </button>
        </section>

        <nav className="tab-bar tab-bar--feed">
          <div className="tab active">
            Feed
            <span className="tab-pip" />
          </div>
          <div className="tab">Discover</div>
          <div className="tab">Wallet</div>
        </nav>
      </div>
    </PhoneFrame>
  )
}
