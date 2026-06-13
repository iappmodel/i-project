import { getSupabaseClient } from '../lib/supabaseClient'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidFollowTarget(creatorId: string): boolean {
  return UUID_RE.test(creatorId)
}

export interface FollowResult {
  success: boolean
  isFollowing?: boolean
  error?: string
}

export async function checkFollowStatus(
  followerId: string,
  followingId: string,
): Promise<{ isFollowing: boolean; error?: string }> {
  if (!isValidFollowTarget(followerId) || !isValidFollowTarget(followingId)) {
    return { isFollowing: false }
  }

  const supabase = getSupabaseClient()
  if (!supabase) return { isFollowing: false, error: 'Supabase not configured' }

  const { data, error } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle()

  if (error) return { isFollowing: false, error: error.message }
  return { isFollowing: !!data }
}

export async function followCreator(
  followerId: string,
  followingId: string,
): Promise<FollowResult> {
  if (!isValidFollowTarget(followerId) || !isValidFollowTarget(followingId)) {
    return { success: false, error: 'Invalid user ID' }
  }
  if (followerId === followingId) {
    return { success: false, error: "You can't follow yourself" }
  }

  const supabase = getSupabaseClient()
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  const { error } = await supabase.from('user_follows').insert({
    follower_id: followerId,
    following_id: followingId,
  })

  if (error) {
    if (error.code === '23505') return { success: true, isFollowing: true }
    return { success: false, error: error.message }
  }
  return { success: true, isFollowing: true }
}

export async function unfollowCreator(
  followerId: string,
  followingId: string,
): Promise<FollowResult> {
  if (!isValidFollowTarget(followerId) || !isValidFollowTarget(followingId)) {
    return { success: false, error: 'Invalid user ID' }
  }

  const supabase = getSupabaseClient()
  if (!supabase) return { success: false, error: 'Supabase not configured' }

  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId)

  if (error) return { success: false, error: error.message }
  return { success: true, isFollowing: false }
}

export async function toggleFollow(
  followerId: string,
  followingId: string,
  currentState: boolean,
): Promise<FollowResult> {
  return currentState
    ? unfollowCreator(followerId, followingId)
    : followCreator(followerId, followingId)
}
