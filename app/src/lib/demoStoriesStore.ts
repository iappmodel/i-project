export type StoryBubble = {
  id: string
  username: string
  avatarInitials: string
  seen: boolean
  isOwn?: boolean
}

const DEMO: StoryBubble[] = [
  { id: 's1', username: 'RAFAELO', avatarInitials: 'RA', seen: false },
  { id: 's2', username: 'Nike', avatarInitials: 'NK', seen: false },
  { id: 's3', username: 'Local', avatarInitials: 'LC', seen: true },
  { id: 's4', username: 'You', avatarInitials: '+', seen: true, isOwn: true },
]

export function readDemoStories(): StoryBubble[] {
  return DEMO
}
