import { useCallback, useState } from 'react'
import { Button } from '../Button'
import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { useComments } from '../../hooks/useComments'

type Props = {
  open: boolean
  contentId: string | null
  onClose: () => void
  onToast?: (message: string) => void
}

function timeAgo(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 60) return 'now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  return `${Math.floor(hr / 24)}d`
}

export function ImmersiveCommentsSheet({ open, contentId, onClose, onToast }: Props) {
  const { comments, loading, posting, addComment, maxLength } = useComments({
    contentId: open ? contentId : null,
  })
  const [draft, setDraft] = useState('')

  const handleSubmit = useCallback(async () => {
    const text = draft.trim()
    if (!text) return
    await addComment(text)
    setDraft('')
    onToast?.('Comment posted')
  }, [addComment, draft, onToast])

  return (
    <ImmersiveGlassSheet open={open} title="Comments" onClose={onClose}>
      <div className="comments-sheet">
        <ul className="comments-sheet__list">
          {loading ? (
            <li className="comments-sheet__empty">Loading…</li>
          ) : comments.length === 0 ? (
            <li className="comments-sheet__empty">Be the first to comment</li>
          ) : (
            comments.map((c) => (
              <li key={c.id} className="comments-sheet__item">
                <div className="comments-sheet__head">
                  <span className="comments-sheet__user">{c.username}</span>
                  <span className="comments-sheet__time mono">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="comments-sheet__body">{c.content}</p>
                {c.likes > 0 ? (
                  <span className="comments-sheet__likes mono">♥ {c.likes}</span>
                ) : null}
              </li>
            ))
          )}
        </ul>
        <form
          className="comments-sheet__composer"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSubmit()
          }}
        >
          <textarea
            className="comments-sheet__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, maxLength))}
            placeholder="Add a comment…"
            rows={2}
            maxLength={maxLength}
          />
          <Button
            type="submit"
            variant="secondary"
            className="comments-sheet__send"
            disabled={posting || !draft.trim()}
          >
            Post
          </Button>
        </form>
      </div>
    </ImmersiveGlassSheet>
  )
}
