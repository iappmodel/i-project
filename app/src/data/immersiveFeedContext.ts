/** Active media on immersive feed — ties gestures to content + creator for likes/tips */

export interface ImmersiveMediaContext {
  contentId: string
  creatorId: string
  creatorName: string
  creatorLocation: string
  creatorAvatarInitials: string
  initialLikeCount: number
}

export const DEMO_IMMERSIVE_MEDIA: ImmersiveMediaContext = {
  contentId: 'immersive-demo-rafaelo-sunset',
  creatorId: 'creator-rafaelo-demo',
  creatorName: 'RAFAELO',
  creatorLocation: 'Cape Town',
  creatorAvatarInitials: 'RA',
  initialLikeCount: 2842,
}
