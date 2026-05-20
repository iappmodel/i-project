import { BottomNav } from '../components/BottomNav'
import { Card } from '../components/Card'
import { HeaderBar } from '../components/HeaderBar'
import { PhoneFrame } from '../components/PhoneFrame'
import { SourceEvidence } from '../components/SourceEvidence'
import { DEFAULT_SPONSORED_OFFER } from '../data/demoData'
import { formatIcoinsAmount } from '../lib/format'
import { useDemo } from '../state/useDemo'

export function FeedScreen() {
  const { iCoins, selectOffer, jumpWallet, setScreen } = useDemo()

  return (
    <PhoneFrame scroll>
      <div className="feed-phone-layout">
        <div className="feed-top-chrome">
          <HeaderBar walletBalance={iCoins} onWalletClick={() => jumpWallet()} />
          <div className="stories-row">
            {['Add', '@maya', '@jake', '@nora', '@chef', '@alex'].map((name, idx) => (
              <button
                key={name}
                type="button"
                className="story"
                onClick={() => setScreen('feed')}
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
          <div className="filter-row">
            {['For you', 'Friends', 'Earn', 'Trending'].map((p, i) => (
              <button
                key={p}
                type="button"
                className={`pill ${i === 0 ? 'active' : ''}`}
                onClick={() => (p === 'Earn' ? selectOffer(DEFAULT_SPONSORED_OFFER) : setScreen('feed'))}
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
              <p className="card-caption">Organic feed card — tap sponsored card below for Loop 1.</p>
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

        <BottomNav
          active="feed"
          onFeed={() => setScreen('feed')}
          onDiscover={() => setScreen('roadmap')}
          onWallet={() => jumpWallet()}
        />
      </div>
      <SourceEvidence
        paths={[
          '06_feed_earning_loops/iapp_feed_screen.html',
          '06_feed_earning_loops/iapp_immersive_feed.html',
          'integrations/eye-tracking/demos/investor-demo/src/screens/FeedScreen.tsx',
        ]}
      />
    </PhoneFrame>
  )
}
