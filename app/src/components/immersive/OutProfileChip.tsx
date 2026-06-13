type Props = {
  name?: string
  location?: string
  avatarInitials?: string
  avatarUrl?: string
  onPress?: () => void
  isFollowing?: boolean
  followLoading?: boolean
  onFollowToggle?: () => void
  showFollow?: boolean
}

export function OutProfileChip({
  name = 'RAFAELO',
  location = 'Cape Town',
  avatarInitials = 'RA',
  avatarUrl,
  onPress,
  isFollowing = false,
  followLoading = false,
  onFollowToggle,
  showFollow = false,
}: Props) {
  const inner = (
    <>
      <div className="out-profile__row">
        <div className="out-profile__avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="out-profile__avatar-img" />
          ) : (
            <span>{avatarInitials}</span>
          )}
        </div>
        {showFollow && onFollowToggle ? (
          <button
            type="button"
            className={`out-profile__follow${isFollowing ? ' out-profile__follow--on' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onFollowToggle()
            }}
            disabled={followLoading}
            aria-pressed={isFollowing}
            aria-label={isFollowing ? `Unfollow ${name}` : `Follow ${name}`}
          >
            {followLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
          </button>
        ) : null}
      </div>
      <p className="out-profile__name">{name}</p>
      <p className="out-profile__loc">{location}</p>
    </>
  )

  if (onPress) {
    return (
      <button
        type="button"
        className="out-profile out-profile--button"
        onClick={onPress}
        aria-label={`Creator ${name}`}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className="out-profile" aria-label={`Creator ${name}`}>
      {inner}
    </div>
  )
}
