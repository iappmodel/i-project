/** Minimal ComboAction surface for screen-target mapping (full combo engine deferred). */

export type ComboAction =
  | 'like'
  | 'comment'
  | 'share'
  | 'follow'
  | 'nextVideo'
  | 'prevVideo'
  | 'friendsFeed'
  | 'promoFeed'
  | 'openSettings'
  | 'toggleMute'
  | 'save'
  | 'openWallet'
  | 'openProfile'
  | 'openMap'
  | 'openMessages'
  | 'openAchievements'
  | 'openRouteBuilder'
  | 'openSavedVideos'
  | 'toggleRemoteControl'
  | 'checkIn'
  | 'tipCreator'
  | 'viewCreatorProfile'
  | 'report'
  | 'none'

export const COMBO_ACTION_LABELS: Record<ComboAction, string> = {
  like: 'Like Video',
  comment: 'Open Comments',
  share: 'Share',
  follow: 'Follow Creator',
  nextVideo: 'Next Video',
  prevVideo: 'Previous Video',
  friendsFeed: 'Friends Feed',
  promoFeed: 'Promo Feed',
  openSettings: 'Open Settings',
  toggleMute: 'Toggle Mute',
  save: 'Save Video',
  openWallet: 'Open Wallet',
  openProfile: 'Open Profile',
  openMap: 'Open Map',
  openMessages: 'Open Messages',
  openAchievements: 'Achievements',
  openRouteBuilder: 'Route Builder',
  openSavedVideos: 'Saved Videos',
  toggleRemoteControl: 'Toggle Remote',
  checkIn: 'Check In',
  tipCreator: 'Tip Creator',
  viewCreatorProfile: 'View Creator Profile',
  report: 'Report Content',
  none: 'No Action',
}
