import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  variant?: 'default' | 'void'
  /** Taller screens (wallet, convert) scroll inside */
  scroll?: boolean
}

export function PhoneFrame({ children, variant = 'default', scroll }: Props) {
  return (
    <div className={`phone-shell ${variant === 'void' ? 'phone-shell--void' : ''}`}>
      <div className="phone">
        <div className="notch" aria-hidden />
        <div className={`phone-screen ${scroll ? 'phone-screen--scroll' : ''}`}>{children}</div>
      </div>
    </div>
  )
}
