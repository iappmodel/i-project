import { ImmersiveGlassSheet } from './ImmersiveGlassSheet'
import { useConversations } from '../../hooks/useConversations'

type Props = {
  open: boolean
  onClose: () => void
}

export function ImmersiveMessagesSheet({ open, onClose }: Props) {
  const { threads, unreadTotal } = useConversations()

  return (
    <ImmersiveGlassSheet open={open} title={`Messages${unreadTotal ? ` (${unreadTotal})` : ''}`} onClose={onClose}>
      <ul className="messages-sheet__list">
        {threads.map((t) => (
          <li key={t.id} className="messages-sheet__item">
            <div className="messages-sheet__head">
              <span className="messages-sheet__name">{t.name}</span>
              {t.unread > 0 ? <span className="messages-sheet__badge mono">{t.unread}</span> : null}
            </div>
            <p className="messages-sheet__preview">{t.preview}</p>
          </li>
        ))}
      </ul>
    </ImmersiveGlassSheet>
  )
}
