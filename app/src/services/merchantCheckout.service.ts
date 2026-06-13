import {
  getMerchantCheckoutScenarios,
  resolveMerchantCheckoutPlan,
  calculateQuote,
} from '../features/merchantCheckout/mockResolver'
import type {
  MerchantCheckoutScenario,
  MerchantCheckoutUserPreferences,
  MerchantCheckoutWalletSnapshot,
} from '../features/merchantCheckout/types'

const DEFAULT_PREFS: MerchantCheckoutUserPreferences = {
  labelLanguage: 'MERCHANT_ORIGINAL',
  tipPromptLayoutGlobal: 'BOTTOM_SHEET',
  tipPromptLayoutByCategory: {},
  autoConvertPreferenceEnabled: false,
}

const DEFAULT_WALLET: MerchantCheckoutWalletSnapshot = {
  icoinsAvailableMinor: 50000,
  vicoinsAvailable: 120,
  exchangeRate: { vicoinsPerIcoinMinorUnit: 1, conversionFeeMinor: 25 },
}

export function listCheckoutScenarios(): MerchantCheckoutScenario[] {
  return getMerchantCheckoutScenarios()
}

export function previewCheckoutQuote(scenarioId: string, amountMinor: number) {
  const scenario = getMerchantCheckoutScenarios().find((s) => s.id === scenarioId)
  if (!scenario) return null
  const plan = resolveMerchantCheckoutPlan({
    scenario,
    userPreferences: DEFAULT_PREFS,
    wallet: DEFAULT_WALLET,
    accessibility: { screenReader: false, largeText: false, reducedMotion: false },
  })
  return calculateQuote({
    scenario,
    plan,
    draft: { enteredAmountMinor: amountMinor, prePayTipSelection: { kind: 'NONE' }, paymentSourceSelection: 'ICOINS' },
    wallet: DEFAULT_WALLET,
  })
}
