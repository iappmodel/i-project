type Props = {
  name?: string
  location?: string
  avatarInitials?: string
  avatarUrl?: string
  onPress?: () => void
}

export function OutProfileChip({
  name = 'RAFAELO',
  location = 'Cape Town',
  avatarInitials = 'RA',
  avatarUrl,
  onPress,
}: Props) {
  const inner = (
    <>
      <div className="out-profile__avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="out-profile__avatar-img" />
        ) : (
          <span>{avatarInitials}</span>
        )}
      </div>
      <p className="out-profile__name">{name}</p>
      <p className="out-profile__loc">{location}</p>
    </>
  )

  if (onPress) {
    return (
      <button type="button" className="out-profile out-profile--button" onClick={onPress} aria-label={`Creator ${name}`}>
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
