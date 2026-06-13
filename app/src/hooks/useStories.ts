import { useMemo } from 'react'
import { readDemoStories, type StoryBubble } from '../lib/demoStoriesStore'

export function useStories(): { stories: StoryBubble[] } {
  const stories = useMemo(() => readDemoStories(), [])
  return { stories }
}
