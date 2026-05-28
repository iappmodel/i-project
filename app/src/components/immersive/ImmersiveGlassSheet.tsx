import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function ImmersiveGlassSheet({ open, title, onClose, children }: Props) {
  if (!open) return null
  return (
    <div className="immersive-glass-sheet" role="dialog" aria-modal aria-label={title}>
      <button type="button" className="immersive-glass-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="immersive-glass-sheet__panel">
        <header className="immersive-glass-sheet__header">
          <h2 className="immersive-glass-sheet__title">{title}</h2>
          <button type="button" className="immersive-glass-sheet__close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="immersive-glass-sheet__body">{children}</div>
      </div>
    </div>
  )
}
