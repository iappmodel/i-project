/** Active media on immersive feed — ties gestures to content + creator for likes/tips */

export interface ImmersiveMediaContext {
  contentId: string
  creatorId: string
  creatorName: string
  creatorLocation: string
  creatorAvatarInitials: string
  initialLikeCount: number
}

export interface ImmersiveFeedItem extends ImmersiveMediaContext {
  id: string
  title: string
  category: string
  tags: string[]
  thumbnail: string
  videoSrc: string | null
  reward: number
  coinType: 'icoin' | 'vicoin'
  duration: number
}

export const DEMO_IMMERSIVE_MEDIA: ImmersiveMediaContext = {
  contentId: 'immersive-demo-rafaelo-sunset',
  creatorId: 'creator-rafaelo-demo',
  creatorName: 'RAFAELO',
  creatorLocation: 'Cape Town',
  creatorAvatarInitials: 'RA',
  initialLikeCount: 2842,
}

export function feedItemToMedia(item: ImmersiveFeedItem): ImmersiveMediaContext {
  return {
    contentId: item.contentId,
    creatorId: item.creatorId,
    creatorName: item.creatorName,
    creatorLocation: item.creatorLocation,
    creatorAvatarInitials: item.creatorAvatarInitials,
    initialLikeCount: item.initialLikeCount,
  }
}
