import type { ReactNode } from 'react'
import { useInvestorDemo } from '../useInvestorDemoState'

interface Props {
  children: ReactNode
}

export function InvestorPhoneShell({ children }: Props) {
  const { state } = useInvestorDemo()

  return (
    <div className="id-phone-col">
      <div className="id-phone">
        {/* Notch (desktop only via CSS) */}
        <div className="id-notch" aria-hidden />

        {/* Phone screen content */}
        <div className="id-screen">{children}</div>

        {/* Toast overlay */}
        {state.toast !== null && (
          <div className="id-toast" role="status" aria-live="polite">
            {state.toast}
          </div>
        )}
      </div>
    </div>
  )
}
