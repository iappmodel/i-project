import { FEED_ITEMS } from '../investorDemoData'
import { useInvestorDemo } from '../useInvestorDemoState'
import { InvestorActionRail } from '../components/InvestorActionRail'
import { InvestorDock } from '../components/InvestorDock'
const BAR_DELAYS = [0, 0.12, 0.24, 0.36, 0.18, 0.06, 0.3, 0.42, 0.15]
const BAR_COLORS = ['#1D9E75', '#5DCAA5', '#1D9E75', '#1D9E75', '#5DCAA5', '#1D9E75', '#1D9E75', '#5DCAA5', '#1D9E75']

export function InvestorFeedView() {
  const { state, setFeedIndex, selectOffer, goView, showToast, setPresenterStep, openThreeLoops } =
    useInvestorDemo()

  const { currentFeedIndex, walletBalance } = state
  const item = FEED_ITEMS[currentFeedIndex]

  const handlePrev = () => {
    const prev = (currentFeedIndex - 1 + FEED_ITEMS.length) % FEED_ITEMS.length
    setFeedIndex(prev)
  }

  const handleNext = () => {
    const next = (currentFeedIndex + 1) % FEED_ITEMS.length
    setFeedIndex(next)
  }

  const handleRewardBadge = () => {
    if (item.type === 'sponsored' && item.id) {
      selectOffer(item.id)
    }
  }

  const handleWalletChip = () => {
    setPresenterStep(5)
    goView('wallet')
  }

  const balanceDisplay = walletBalance.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  // Decorative timer-line at 38% (represents current session)
  const timerPct = 38

  return (
    <div className="id-feed">
      {/* Full-bleed gradient background */}
      <div
        className="id-feed__bg"
        style={{ background: item.bgGradient }}
        aria-hidden
      />

      {/* Decorative gradient scrim */}
      <div className="id-feed__scrim" aria-hidden />

      {/* Simulated media visual */}
      <div className="id-feed__media-art" aria-hidden>
        {item.type === 'organic' ? (
          <div className="id-feed__waveform">
            {BAR_DELAYS.map((delay, i) => (
              <div
                key={i}
                className="id-feed__bar"
                style={{
                  background: BAR_COLORS[i],
                  animationDelay: `${delay}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `${item.avatarColor}18`,
            border: `1.5px solid ${item.avatarColor}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 700,
            color: item.avatarColor,
          }}>
            {item.avatarInitials}
          </div>
        )}
      </div>

      {/* Timer line (decorative) */}
      <div
        className="id-timer-line"
        style={{ width: `${timerPct}%` }}
        aria-hidden
      />

      {/* Top overlay: wallet chip + reward badge */}
      <div className="id-feed__top">
        {/* Wallet chip */}
        <button
          type="button"
          className="id-wallet-chip"
          onClick={handleWalletChip}
          aria-label={`Wallet balance ${balanceDisplay} iCoins`}
        >
          <span className="id-wallet-chip__dot" aria-hidden />
          <span className="id-wallet-chip__val">{balanceDisplay} iC</span>
        </button>

        {/* Reward badge — sponsored items only */}
        {item.type === 'sponsored' && item.earnLabel && (
          <button
            type="button"
            className="id-reward-badge"
            onClick={handleRewardBadge}
            aria-label={`Earn ${item.earnLabel} — tap to see offer`}
          >
            <span className="id-reward-badge__dot" aria-hidden />
            <span className="id-reward-badge__txt">EARN {item.earnLabel}</span>
          </button>
        )}
      </div>

      <button type="button" className="id-feed__loops-entry" onClick={openThreeLoops}>
        <span className="id-feed__loops-entry-icon" aria-hidden>∞</span>
        <span className="id-feed__loops-entry-text">
          <span className="id-feed__loops-entry-title">Three Loops</span>
          <span className="id-feed__loops-entry-sub">
            How [ i ] turns verified attention into value
          </span>
        </span>
        <span className="id-feed__loops-entry-cta">View system</span>
      </button>

      {/* Nav arrows */}
      <button
        type="button"
        className="id-feed__nav id-feed__nav--left"
        onClick={handlePrev}
        aria-label="Previous item"
      >
        ‹
      </button>
      <button
        type="button"
        className="id-feed__nav id-feed__nav--right"
        onClick={handleNext}
        aria-label="Next item"
      >
        ›
      </button>

      {/* Item dots */}
      <div className="id-feed__dots" aria-hidden>
        {FEED_ITEMS.map((_, i) => (
          <div
            key={i}
            className={`id-feed__dot${i === currentFeedIndex ? ' on' : ''}`}
          />
        ))}
      </div>

      {/* Bottom: creator strip + caption */}
      <div className="id-feed__bottom">
        <div className="id-creator-strip">
          <div
            className="id-creator-strip__avatar"
            style={{
              background: `${item.avatarColor}20`,
              color: item.avatarColor,
            }}
            aria-hidden
          >
            {item.avatarInitials}
          </div>
          <div className="id-creator-strip__info">
            <span className="id-creator-strip__handle">{item.creatorHandle}</span>
            <span className="id-creator-strip__platform">{item.platform}</span>
          </div>
        </div>
        <p className="id-feed__caption">{item.caption}</p>

        {/* Sponsored tap hint */}
        {item.type === 'sponsored' && (
          <button
            type="button"
            onClick={handleRewardBadge}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.06em',
              textAlign: 'left',
              textTransform: 'uppercase',
            }}
            aria-label="Tap to view offer and earn"
          >
            tap reward badge to earn →
          </button>
        )}
      </div>

      {/* Action rail */}
      <InvestorActionRail contentId={item.id} />

      {/* Dock */}
      <InvestorDock />

      {/* Organic label for non-sponsored */}
      {item.type === 'organic' && (
        <button
          type="button"
          onClick={() => showToast('Organic creator content')}
          style={{
            position: 'absolute',
            top: 16,
            right: 14,
            background: 'rgba(0,0,0,0.4)',
            border: '0.5px solid rgba(255,255,255,0.14)',
            borderRadius: 999,
            padding: '3px 9px',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            zIndex: 25,
          }}
          aria-label="Organic content info"
        >
          organic
        </button>
      )}
    </div>
  )
}
