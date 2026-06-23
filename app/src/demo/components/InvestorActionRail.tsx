import { useInvestorDemo } from '../useInvestorDemoState'

interface Props {
  contentId: string
}

export function InvestorActionRail({ contentId }: Props) {
  const { state, likeToggle, saveToggle, showToast } = useInvestorDemo()

  const isLiked = state.likedContentIds.includes(contentId)
  const isSaved = state.savedContentIds.includes(contentId)

  const handleLike = () => {
    likeToggle(contentId)
    showToast(isLiked ? 'Like removed' : '♥ Liked')
  }

  const handleSave = () => {
    saveToggle(contentId)
    showToast(isSaved ? 'Removed from saved' : '✦ Saved to vault')
  }

  const handleShare = () => {
    showToast('Share link copied')
  }

  const handleMessage = () => {
    showToast('Message composer — full walkthrough')
  }

  const handleControls = () => {
    showToast('Gesture controls — full walkthrough')
  }

  const likeCount = isLiked ? 2841 : 2840

  return (
    <div className="id-rail">
      {/* Like */}
      <button
        type="button"
        className={`id-rail__btn${isLiked ? ' liked' : ''}`}
        onClick={handleLike}
        aria-label={isLiked ? 'Unlike' : 'Like'}
        aria-pressed={isLiked}
      >
        <div className="id-rail__icon">
          <span>{isLiked ? '♥' : '♡'}</span>
        </div>
        <span className="id-rail__count">{likeCount.toLocaleString()}</span>
      </button>

      {/* Save */}
      <button
        type="button"
        className={`id-rail__btn${isSaved ? ' saved' : ''}`}
        onClick={handleSave}
        aria-label={isSaved ? 'Unsave' : 'Save'}
        aria-pressed={isSaved}
      >
        <div className="id-rail__icon">
          <span>{isSaved ? '✦' : '✧'}</span>
        </div>
        <span className="id-rail__count">Save</span>
      </button>

      {/* Share */}
      <button
        type="button"
        className="id-rail__btn"
        onClick={handleShare}
        aria-label="Share"
      >
        <div className="id-rail__icon">
          <span>↗</span>
        </div>
        <span className="id-rail__count">Share</span>
      </button>

      {/* Message */}
      <button
        type="button"
        className="id-rail__btn"
        onClick={handleMessage}
        aria-label="Message creator"
      >
        <div className="id-rail__icon">
          <span>✉</span>
        </div>
        <span className="id-rail__count">Msg</span>
      </button>

      {/* Controls */}
      <button
        type="button"
        className="id-rail__btn"
        onClick={handleControls}
        aria-label="Controls"
      >
        <div className="id-rail__icon">
          <span>⊙</span>
        </div>
        <span className="id-rail__count">More</span>
      </button>
    </div>
  )
}
