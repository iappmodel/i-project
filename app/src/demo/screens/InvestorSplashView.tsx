import { useInvestorDemo } from '../useInvestorDemoState'

export function InvestorSplashView() {
  const { goView, setPresenterStep } = useInvestorDemo()

  const handleStart = () => {
    setPresenterStep(1)
    goView('feed')
  }

  return (
    <div className="id-splash">
      <div className="id-splash__logo">
        [<span>i</span>]
      </div>
      <p className="id-splash__tag">Attention Wallet &amp; Media Marketplace</p>

      <button
        type="button"
        className="id-splash__cta"
        onClick={handleStart}
      >
        Start Investor Demo
      </button>

      <p className="id-splash__note">Investor Demo · Simulated</p>
    </div>
  )
}
