import type { StoryBubble } from '../../lib/demoStoriesStore'

type Props = {
  stories: StoryBubble[]
  onSelect?: (id: string) => void
}

export function StoriesRing({ stories, onSelect }: Props) {
  return (
    <div className="stories-ring" aria-label="Stories">
      {stories.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`stories-ring__bubble${s.seen ? ' stories-ring__bubble--seen' : ''}${s.isOwn ? ' stories-ring__bubble--own' : ''}`}
          onClick={() => onSelect?.(s.id)}
          aria-label={s.username}
        >
          <span className="stories-ring__avatar">{s.avatarInitials}</span>
          <span className="stories-ring__name">{s.isOwn ? 'You' : s.username.slice(0, 6)}</span>
        </button>
      ))}
    </div>
  )
}
