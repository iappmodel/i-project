export type OutProfileCreator = {
  id: string
  handle: string
  displayName: string
  location: string
  avatarInitials: string
  avatarUrl?: string
  sponsoredOfferId?: string
}

const DEFAULT_CREATOR: OutProfileCreator = {
  id: 'creator-rafaelo',
  handle: '@rafaelo',
  displayName: 'RAFAELO',
  location: 'Cape Town',
  avatarInitials: 'RA',
  sponsoredOfferId: 'nike-pegasus-41',
}

export function resolveOutProfileCreator(input?: Partial<OutProfileCreator>): OutProfileCreator {
  return { ...DEFAULT_CREATOR, ...input }
}

export type OutProfileAction =
  | { type: 'open_offer' }
  | { type: 'open_creator_feed' }
  | { type: 'none' }

export function outProfileTapAction(creator: OutProfileCreator): OutProfileAction {
  if (creator.sponsoredOfferId) return { type: 'open_offer' }
  return { type: 'open_creator_feed' }
}
