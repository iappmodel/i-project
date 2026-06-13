const TOPICS = ['For You', 'Friends', 'Promo', 'Saved', 'Trending', 'Music'] as const
export type TopicId = (typeof TOPICS)[number]

type Props = {
  active: TopicId[]
  onToggle: (id: TopicId) => void
}

export function TopicFilterBar({ active, onToggle }: Props) {
  return (
    <div className="topic-filter" role="toolbar" aria-label="Feed topics">
      {TOPICS.map((id) => (
        <button
          key={id}
          type="button"
          className={`topic-filter__pill${active.includes(id) ? ' topic-filter__pill--on' : ''}`}
          onClick={() => onToggle(id)}
        >
          {id}
        </button>
      ))}
    </div>
  )
}
