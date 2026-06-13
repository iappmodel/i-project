import {
  addDemoComment,
  COMMENT_MAX_LENGTH,
  readDemoComments,
  type DemoComment,
} from '../lib/demoCommentsStore'
import { getSupabaseClient } from '../lib/supabaseClient'

export type CommentRow = {
  id: string
  userId: string
  username: string
  content: string
  createdAt: number
  likes: number
}

export { COMMENT_MAX_LENGTH }

function fromDemo(row: DemoComment): CommentRow {
  return {
    id: row.id,
    userId: row.userId,
    username: row.username,
    content: row.content,
    createdAt: row.createdAt,
    likes: row.likes,
  }
}

export async function fetchComments(contentId: string): Promise<CommentRow[]> {
  const supabase = getSupabaseClient()
  if (!supabase) return readDemoComments(contentId).map(fromDemo)

  const { data, error } = await supabase
    .from('comments')
    .select('id, content, user_id, likes_count, created_at')
    .eq('content_id', contentId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error || !data) return readDemoComments(contentId).map(fromDemo)

  const userIds = [...new Set(data.map((r) => r.user_id))]
  const { data: profiles } = await supabase
    .from('public_profiles')
    .select('user_id, username, display_name')
    .in('user_id', userIds)

  const nameMap = new Map(
    (profiles ?? []).map((p) => [
      p.user_id,
      p.display_name || p.username || 'user',
    ]),
  )

  return data.map((r) => ({
    id: r.id,
    userId: r.user_id,
    username: nameMap.get(r.user_id) ?? 'user',
    content: r.content,
    createdAt: new Date(r.created_at).getTime(),
    likes: r.likes_count ?? 0,
  }))
}

export async function postComment(
  userId: string | null,
  username: string,
  contentId: string,
  text: string,
  contentType: 'user_content' | 'promotion' = 'user_content',
): Promise<CommentRow[]> {
  const trimmed = text.trim().slice(0, COMMENT_MAX_LENGTH)
  if (!trimmed) return fetchComments(contentId)

  if (!userId) {
    return addDemoComment(contentId, 'demo-user', username || 'You', trimmed).map(fromDemo)
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return addDemoComment(contentId, userId, username || 'You', trimmed).map(fromDemo)
  }

  const { error } = await supabase.from('comments').insert({
    user_id: userId,
    content_id: contentId,
    content: trimmed,
    content_type: contentType,
  })

  if (error) {
    return addDemoComment(contentId, userId, username || 'You', trimmed).map(fromDemo)
  }

  return fetchComments(contentId)
}
