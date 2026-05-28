import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  loadPresenceConfig,
  savePresenceConfig,
  setActivated as persistActivated,
  setRoom as persistRoom,
  updateStack as persistStack,
} from '../lib/elo/configStore'
import { getPresenceRoom } from '../lib/elo/rooms'
import type {
  EloOrbState,
  EloPersonalityStack,
  EloPresenceConfig,
  PresenceRoom,
  PresenceRoomId,
} from '../lib/elo/types'

export interface EloContextValue {
  config: EloPresenceConfig
  room: PresenceRoom
  orbState: EloOrbState
  emergence: number
  evoked: boolean
  panelOpen: boolean
  onboardingOpen: boolean
  setOrbState: (state: EloOrbState) => void
  evoke: () => void
  activate: () => void
  openPanel: () => void
  closePanel: () => void
  openOnboarding: () => void
  closeOnboarding: () => void
  setStack: (stack: EloPersonalityStack) => void
  setRoom: (roomId: PresenceRoomId) => void
  completeOnboarding: (stack: EloPersonalityStack) => void
  setEmergence: (value: number) => void
}

const EloContext = createContext<EloContextValue | null>(null)

export function useElo(): EloContextValue {
  const ctx = useContext(EloContext)
  if (!ctx) throw new Error('useElo must be used within EloProvider')
  return ctx
}

export function EloProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<EloPresenceConfig>(() => loadPresenceConfig())
  const [orbState, setOrbState] = useState<EloOrbState>('idle')
  const [emergence, setEmergence] = useState(0)
  const [evoked, setEvoked] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)

  const room = useMemo(() => getPresenceRoom(config.roomId), [config.roomId])

  const persist = useCallback((next: EloPresenceConfig) => {
    savePresenceConfig(next)
    setConfig(next)
  }, [])

  const evoke = useCallback(() => {
    setEvoked(true)
    setEmergence(1)
    if (!config.activated) {
      const next = persistActivated(true)
      setConfig(next)
    }
  }, [config.activated])

  const activate = useCallback(() => {
    setEvoked(true)
    const next = persistActivated(true)
    setConfig(next)
  }, [])

  const setStack = useCallback((stack: EloPersonalityStack) => {
    const next = persistStack(stack)
    setConfig(next)
  }, [])

  const setRoom = useCallback((roomId: PresenceRoomId) => {
    const next = persistRoom(roomId)
    setConfig(next)
  }, [])

  const completeOnboarding = useCallback(
    (stack: EloPersonalityStack) => {
      const next = persistStack(stack)
      persist({ ...next, onboardingComplete: true, activated: true })
      setConfig({ ...next, onboardingComplete: true, activated: true })
      setEvoked(true)
      setOnboardingOpen(false)
    },
    [persist],
  )

  const openPanel = useCallback(() => setPanelOpen(true), [])
  const closePanel = useCallback(() => setPanelOpen(false), [])
  const openOnboarding = useCallback(() => setOnboardingOpen(true), [])
  const closeOnboarding = useCallback(() => setOnboardingOpen(false), [])

  useEffect(() => {
    if (!evoked) return
    setEmergence(1)
  }, [evoked])

  const value = useMemo<EloContextValue>(
    () => ({
      config,
      room,
      orbState,
      emergence,
      evoked,
      panelOpen,
      onboardingOpen,
      setOrbState,
      evoke,
      activate,
      openPanel,
      closePanel,
      openOnboarding,
      closeOnboarding,
      setStack,
      setRoom,
      completeOnboarding,
      setEmergence,
    }),
    [
      config,
      room,
      orbState,
      emergence,
      evoked,
      panelOpen,
      onboardingOpen,
      evoke,
      activate,
      openPanel,
      closePanel,
      openOnboarding,
      closeOnboarding,
      setStack,
      setRoom,
      completeOnboarding,
    ],
  )

  return <EloContext.Provider value={value}>{children}</EloContext.Provider>
}
