import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { stopEloSpeech } from '../lib/elo/eloSpeechOut'
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
  sessionActive: boolean
  panelOpen: boolean
  onboardingOpen: boolean
  setOrbState: (state: EloOrbState) => void
  evoke: () => void
  startSession: () => void
  activate: () => void
  openPanel: () => void
  closePanel: () => void
  openOnboarding: () => void
  closeOnboarding: () => void
  setStack: (stack: EloPersonalityStack) => void
  setRoom: (roomId: PresenceRoomId) => void
  completeOnboarding: (stack: EloPersonalityStack) => void
  dismissSession: () => void
  setEmergence: (value: number) => void
  speechEnergy: number
  pulseSpeech: (amount?: number) => void
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
  const [sessionActive, setSessionActive] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [speechEnergy, setSpeechEnergy] = useState(0)
  const speechEnergyRef = useRef(0)
  const decayFrameRef = useRef<number>(0)

  const pulseSpeech = useCallback((amount = 1) => {
    speechEnergyRef.current = Math.min(1, speechEnergyRef.current + amount)
    setSpeechEnergy(speechEnergyRef.current)
  }, [])

  useEffect(() => {
    if (speechEnergy <= 0.01) return

    const decay = () => {
      speechEnergyRef.current *= 0.92
      if (speechEnergyRef.current > 0.02) {
        setSpeechEnergy(speechEnergyRef.current)
        decayFrameRef.current = requestAnimationFrame(decay)
      } else {
        speechEnergyRef.current = 0
        setSpeechEnergy(0)
      }
    }

    decayFrameRef.current = requestAnimationFrame(decay)
    return () => cancelAnimationFrame(decayFrameRef.current)
  }, [speechEnergy])

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

  const startSession = useCallback(() => {
    setSessionActive(true)
  }, [])

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
      setSessionActive(true)
      setOnboardingOpen(false)
      window.setTimeout(() => setPanelOpen(true), 700)
    },
    [persist],
  )

  const dismissSession = useCallback(() => {
    setEvoked(false)
    setSessionActive(false)
    setEmergence(0)
    setPanelOpen(false)
    setOnboardingOpen(false)
    speechEnergyRef.current = 0
    setSpeechEnergy(0)
    stopEloSpeech()
  }, [])

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
      sessionActive,
      panelOpen,
      onboardingOpen,
      setOrbState,
      evoke,
      startSession,
      activate,
      openPanel,
      closePanel,
      openOnboarding,
      closeOnboarding,
      setStack,
      setRoom,
      completeOnboarding,
      dismissSession,
      setEmergence,
      speechEnergy,
      pulseSpeech,
    }),
    [
      config,
      room,
      orbState,
      emergence,
      evoked,
      sessionActive,
      panelOpen,
      onboardingOpen,
      evoke,
      startSession,
      activate,
      openPanel,
      closePanel,
      openOnboarding,
      closeOnboarding,
      setStack,
      setRoom,
      completeOnboarding,
      dismissSession,
      speechEnergy,
      pulseSpeech,
    ],
  )

  return <EloContext.Provider value={value}>{children}</EloContext.Provider>
}
