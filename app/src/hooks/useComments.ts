import { useCallback, useEffect, useState } from 'react'
import {
  COMMENT_MAX_LENGTH,
  fetchComments,
  postComment,
  type CommentRow,
} from '../services/comments.service'
import { useSupabaseAuth } from '../state/useSupabaseAuth'

type Options = {
  contentId: string | null
  contentType?: 'user_content' | 'promotion'
}

export function useComments({ contentId, contentType = 'user_content' }: Options) {
  const { user } = useSupabaseAuth()
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)

  const reload = useCallback(async () => {
    if (!contentId) {
      setComments([])
      return
    }
    setLoading(true)
    try {
      const rows = await fetchComments(contentId)
      setComments(rows)
    } finally {
      setLoading(false)
    }
  }, [contentId])

  useEffect(() => {
    void reload()
  }, [reload])

  const addComment = useCallback(
    async (text: string) => {
      if (!contentId) return comments
      setPosting(true)
      try {
        const username =
          user?.user_metadata?.display_name ||
          user?.user_metadata?.username ||
          user?.email?.split('@')[0] ||
          'You'
        const next = await postComment(user?.id ?? null, username, contentId, text, contentType)
        setComments(next)
        return next
      } finally {
        setPosting(false)
      }
    },
    [comments, contentId, contentType, user],
  )

  return {
    comments,
    loading,
    posting,
    reload,
    addComment,
    maxLength: COMMENT_MAX_LENGTH,
    needsAuth: false,
    isDemo: !user?.id,
  }
}
