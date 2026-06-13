import { MerchantCheckoutSheet } from '../../features/merchantCheckout/MerchantCheckoutSheet'
import { useDemo } from '../../state/useDemo'

type LaunchMode = 'scan' | 'link' | null

type Props = {
  open: boolean
  onClose: () => void
  onToast?: (msg: string) => void
  launchMode?: LaunchMode
  autoStartScenarioId?: string | null
}

export function ImmersivePaySheet({
  open,
  onClose,
  launchMode = null,
  autoStartScenarioId = null,
}: Props) {
  const { iCoins, aCoins } = useDemo()

  return (
    <MerchantCheckoutSheet
      open={open}
      onClose={onClose}
      icoins={iCoins}
      vicoins={aCoins}
      launchMode={launchMode}
      autoStartScenarioId={autoStartScenarioId}
    />
  )
}
