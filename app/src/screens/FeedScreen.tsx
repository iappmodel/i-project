import { Card } from '../components/Card'
import { HeaderBar } from '../components/HeaderBar'
import { TabScreenLayout } from '../components/TabScreenLayout'
import { DEFAULT_SPONSORED_OFFER } from '../data/demoData'
import { formatIcoinsAmount } from '../lib/format'
import { saveLoopItem } from '../lib/savedLoop'
import { isWebVisionEnabled } from '../lib/visionEngine'
import { useScreenTargetActionListener } from '../lib/visionScreenTargets'
import { loadTargets } from '../hooks/useScreenTargets'
import { useDemo } from '../state/useDemo'

export function FeedScreen() {
  const webVisionEnabled = isWebVisionEnabled()
  const lastTargetAction = useScreenTargetActionListener(webVisionEnabled)
  const screenTargetCount = webVisionEnabled ? loadTargets().filter((t) => t.enabled).length : 0
  const {
    iCoins,
    selectOffer,
    jumpWallet,
    setActiveTab,
    setScreen,
    walletBackend,
    proofEventsConnected,
    isNativeShell,
  } = useDemo()

  return (
    <TabScreenLayout
      activeTab="feed"
      evidence={[
        '06_feed_earning_loops/iapp_feed_screen.html',
        '06_feed_earning_loops/iapp_immersive_feed.html',
        'integrations/eye-tracking/demos/investor-demo/src/screens/FeedScreen.tsx',
      ]}
    >
      <div className="feed-top-chrome">
        <HeaderBar walletBalance={iCoins} onWalletClick={() => jumpWallet()} />
        {walletBackend === 'live' || isNativeShell ? (
          <p className="profile-trust-card__hint mono" style={{ padding: '0 16px 8px', fontSize: 11 }}>
            {isNativeShell ? 'Capacitor shell · ' : ''}
            {proofEventsConnected ? '● proof bridge live' : '○ proof bridge'}
          </p>
        ) : null}
        {webVisionEnabled ? (
          <p className="profile-trust-card__hint mono" style={{ padding: '0 16px 8px', fontSize: 11 }}>
            Screen targets: {screenTargetCount} mapped
            {lastTargetAction ? ` · last=${lastTargetAction}` : ''}
          </p>
        ) : null}
        <div className="stories-row">
          {['Add', '@maya', '@jake', '@nora', '@chef', '@alex'].map((name, idx) => (
            <button
              key={name}
              type="button"
              className="story"
              onClick={() => setActiveTab('feed')}
              aria-label={`Story ${name}`}
            >
              <div className="story-wrap">
                <div className={`story-ring ${idx > 3 ? 'seen' : ''}`}>
                  <div className={`story-avatar story-avatar--${idx}`}>
                    {name.startsWith('@') ? name.slice(1, 3).toUpperCase() : '+'}
                  </div>
                </div>
              </div>
              <span className="story-name">{name}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="pill active"
          style={{ margin: '0 16px 10px', display: 'block', width: 'calc(100% - 32px)' }}
          onClick={() => setScreen('immersive-feed')}
        >
          Immersive feed · gesture buttons
        </button>
        <div className="filter-row">
          {['For you', 'Friends', 'Earn', 'Trending'].map((p, i) => (
            <button
              key={p}
              type="button"
              className={`pill ${i === 0 ? 'active' : ''}`}
              onClick={() => (p === 'Earn' ? setActiveTab('earn') : setActiveTab('feed'))}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <section className="feed-list feed-list--main">
        <Card>
          <div className="thumb">
            <div
              className="thumb-gradient"
              style={{ background: 'linear-gradient(135deg,#1a0533,#0d1533,#0a1a0d)' }}
            />
            <div className="thumb-overlay" />
            <div className="thumb-platform-feed">
              <span className="platform-dot-feed platform-dot-feed-tk">TK</span>
              <span className="platform-name-feed">TikTok</span>
            </div>
            <span className="thumb-duration-feed mono">1:24</span>
          </div>
          <div className="card-body">
            <p className="card-caption">Loop 2 · Browse → Save → Return</p>
            <button
              type="button"
              className="sec-link-wu"
              onClick={() => {
                saveLoopItem({
                  id: 'loop2-demo-item',
                  title: 'Loop 2 teaser · Browse → Save → Return',
                  source: 'Feed teaser',
                  savedAt: Date.now(),
                })
                setScreen('saved')
              }}
              style={{ marginTop: 8 }}
            >
              Save this item
            </button>
          </div>
        </Card>

        <Card as="button" sponsored onPress={() => selectOffer(DEFAULT_SPONSORED_OFFER)}>
          <div className="thumb">
            <div
              className="thumb-gradient"
              style={{ background: DEFAULT_SPONSORED_OFFER.thumbnailGradient }}
            />
            <div className="thumb-overlay" />
            <div className="thumb-platform-feed">
              <span className="platform-dot-feed platform-dot-feed-yt">
                {DEFAULT_SPONSORED_OFFER.platformCode ?? 'YT'}
              </span>
              <span className="platform-name-feed">{DEFAULT_SPONSORED_OFFER.platform}</span>
            </div>
            <span className="thumb-duration-feed mono">
              {DEFAULT_SPONSORED_OFFER.watchDuration ?? '4:30'}
            </span>
            <div className="thumb-earn-feed">
              <span className="earn-dot-feed" />
              <span className="earn-val-feed mono">
                {formatIcoinsAmount(DEFAULT_SPONSORED_OFFER.rewardICoins)}
              </span>
            </div>
          </div>
          <div className="card-body card-body--sponsored-tail">
            <p className="card-caption">
              {DEFAULT_SPONSORED_OFFER.title}{' '}
              <span className="caption-tags">{DEFAULT_SPONSORED_OFFER.captionTags ?? ''}</span>
            </p>
          </div>
        </Card>
      </section>
    </TabScreenLayout>
  )
}
