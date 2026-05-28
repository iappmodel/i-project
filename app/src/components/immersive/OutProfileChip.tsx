type Props = {
  name?: string
  location?: string
  avatarInitials?: string
  avatarUrl?: string
}

export function OutProfileChip({
  name = 'RAFAELO',
  location = 'Cape Town',
  avatarInitials = 'RA',
  avatarUrl,
}: Props) {
  return (
    <div className="out-profile" aria-label={`Creator ${name}`}>
      <div className="out-profile__avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="out-profile__avatar-img" />
        ) : (
          <span>{avatarInitials}</span>
        )}
      </div>
      <p className="out-profile__name">{name}</p>
      <p className="out-profile__loc">{location}</p>
    </div>
  )
}
