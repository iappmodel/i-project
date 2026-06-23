import type { ReactNode } from 'react'
import { useDemo } from '../state/useDemo'
import type { DemoScreenId } from '../state/types'

type Props = {
  children: ReactNode
}

/** Screens that use Picture 2 immersive chrome — no desktop titlebar. */
const IMMERSIVE_SCREENS: DemoScreenId[] = ['investor-demo', 'immersive-feed', 'immersive-promo', 'immersive-create', 'watch-verify']

export function AppShell({ children }: Props) {
  const { appMode, currentScreen } = useDemo()
  const hideTitlebar =
    appMode === 'product' && IMMERSIVE_SCREENS.includes(currentScreen)

  return (
    <div
      className={`app-shell ${hideTitlebar ? 'app-shell--immersive' : ''}`}
      data-ui-surface={hideTitlebar ? 'immersive' : 'legacy'}
    >
      {hideTitlebar ? null : (
        <header className="app-shell__titlebar">
          <p className="app-shell__kicker">
            {appMode === 'presenter' ? 'Investor presenter · Loop 1' : 'Legacy utility · presenter/dev'}
          </p>
          <h1 className="app-shell__title">[ i ]</h1>
        </header>
      )}
      <div className="app-shell__host">{children}</div>
    </div>
  )
}
