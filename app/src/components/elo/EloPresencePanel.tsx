import { useEffect, useMemo, useState } from 'react'
import {
  mockContentPreference,
  mockCreatorInsight,
  mockMessages,
  mockPermissions,
  mockSharedPresenceMemory,
  mockTrustState,
  mockWalletState,
  DEMO_PUBLISHED_PERSONALITIES,
} from '../../lib/elo/mockData'
import { composeEloReply } from '../../lib/elo/eloReplyService'
import { getSessionOpening } from '../../lib/elo/sessionOpenings'
import { getEloMemories } from '../../lib/elo/services/eloMemoryService'
import { setEloPermission } from '../../lib/elo/services/eloPermissionService'
import { getEloRecommendations } from '../../lib/elo/services/eloRecommendationService'
import { executeEloAction } from '../../lib/elo/services/eloActionService'
import type { EloAction, EloMessage, EloPermission, EloRecommendation } from '../../lib/elo/types'
import { useElo } from '../../state/eloContext'
import { useEloPersonality } from '../../hooks/useEloPersonality'
import { useDemo } from '../../state/useDemo'
import { EloRoomPicker } from './EloRoomPicker'
import { EloStackEditor } from './EloStackEditor'

const toneClass: Record<string, string> = {
  earning: 'elo-tone-green',
  guidance: 'elo-tone-cyan',
  celebrate: 'elo-tone-green',
  warning: 'elo-tone-amber',
}

function EloChat({
  messages,
  onSend,
}: {
  messages: EloMessage[]
  onSend: (text: string) => void
}) {
  const [draft, setDraft] = useState('')
  return (
    <div className="elo-card">
      <h3>Ask ELO</h3>
      <div className="elo-chat-list">
        {messages.map((m) => (
          <div key={m.id} className={`elo-bubble ${m.role === 'assistant' ? 'assistant' : 'user'}`}>
            {m.content}
          </div>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!draft.trim()) return
          onSend(draft)
          setDraft('')
        }}
      >
        <input
          className="elo-chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about wallet, trust, or your presence…"
        />
      </form>
    </div>
  )
}

export function EloPresencePanel() {
  const { panelOpen, closePanel, setStack, sessionActive, config, room } = useElo()
  const { displayName, relationship, operating } = useEloPersonality()
  const { setScreen, setActiveTab, eloStatusLine, proofEventsConnected } = useDemo()
  const [messages, setMessages] = useState<EloMessage[]>(mockMessages)
  const [permissions, setPermissions] = useState<EloPermission[]>(mockPermissions)
  const memories = useMemo(() => getEloMemories(), [])
  const recommendations = useMemo(() => getEloRecommendations(), [])

  useEffect(() => {
    if (!sessionActive) return
    const opening = getSessionOpening(config.stack)
    setMessages((prev) => {
      if (prev.some((m) => m.id === 'elo-session-open')) return prev
      return [
        {
          id: 'elo-session-open',
          role: 'assistant',
          content: opening,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]
    })
  }, [sessionActive, config.stack])

  if (!panelOpen) return null

  const routeFor = (screen: EloRecommendation['targetScreen']) => {
    closePanel()
    if (screen === 'feed') {
      setActiveTab('feed')
      setScreen('immersive-feed')
      return
    }
    if (screen === 'earn' || screen === 'wallet' || screen === 'profile') {
      setActiveTab(screen)
      setScreen(screen)
    }
  }

  return (
    <>
      <div className="elo-panel-backdrop" aria-hidden onClick={closePanel} role="presentation" />
      <aside className="elo-panel-sheet" aria-label="ELO presence panel">
        <header className="elo-panel-header">
          <div>
            <h2>ELO · {displayName}</h2>
            <p>
              {relationship.label}
              {operating ? ` · ${operating.label}` : ''} ·{' '}
              {proofEventsConnected ? eloStatusLine : 'proof offline'}
            </p>
          </div>
          <button type="button" className="elo-panel-close" onClick={closePanel}>
            Close
          </button>
        </header>

        <EloChat
          messages={messages}
          onSend={(text) => {
            const userMessage: EloMessage = {
              id: `u-${Date.now()}`,
              role: 'user',
              content: text,
              createdAt: new Date().toISOString(),
            }
            const assistantMessage: EloMessage = {
              id: `a-${Date.now() + 1}`,
              role: 'assistant',
              content: composeEloReply({
                userText: text,
                stack: config.stack,
                room,
                proofConnected: proofEventsConnected,
              }),
              createdAt: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, userMessage, assistantMessage])
          }}
        />

        <div className={`elo-card ${toneClass.earning}`}>
          <h4>Today&apos;s best move</h4>
          <p>A verified offer matches your strongest completion pattern today.</p>
        </div>
        <div className={`elo-card ${toneClass.guidance}`}>
          <h4>Wallet intelligence</h4>
          <p>
            Spendable {mockWalletState.spendable} · Pending {mockWalletState.pending}
          </p>
        </div>
        <div className={`elo-card ${toneClass.guidance}`}>
          <h4>Trust progress</h4>
          <p>
            Tier {mockTrustState.tier} · {Math.round(mockTrustState.progressToNextTier * 100)}% to tier{' '}
            {mockTrustState.nextTier}
          </p>
        </div>
        <div className={`elo-card ${toneClass.celebrate}`}>
          <h4>Creator guidance</h4>
          <p>{mockCreatorInsight.recommendation}</p>
        </div>

        <EloStackEditor />
        <EloRoomPicker />

        <p className="elo-section-title">Marketplace of selves</p>
        {DEMO_PUBLISHED_PERSONALITIES.map((pub) => (
          <div key={pub.id} className="elo-card elo-marketplace-card">
            <h4>{pub.title}</h4>
            <p>{pub.description}</p>
            <span className="elo-meta">
              by {pub.authorLabel} · {pub.adoptedCount.toLocaleString()} adopted
            </span>
            <button
              type="button"
              onClick={() => {
                setStack(pub.stack)
              }}
            >
              Adopt
            </button>
            <button
              type="button"
              onClick={() => {
                setStack({
                  ...pub.stack,
                  layers: pub.stack.layers.map((l, i) => ({
                    ...l,
                    id: `remix-${i}-${Date.now()}`,
                  })),
                })
              }}
            >
              Remix
            </button>
          </div>
        ))}

        <p className="elo-section-title">Shared reality memory</p>
        <div className="elo-card">
          <p className="elo-meta">Shared with friend · {mockSharedPresenceMemory.participantIds.length} participants</p>
          <ul className="elo-shared-thread">
            {mockSharedPresenceMemory.thread.map((entry) => (
              <li key={entry.id}>{entry.content}</li>
            ))}
          </ul>
        </div>

        <p className="elo-section-title">Recommendations</p>
        {recommendations.map((rec) => (
          <div key={rec.id} className="elo-card">
            <h4>{rec.title}</h4>
            <p>{rec.body}</p>
            <button
              type="button"
              className="elo-chip"
              style={{ marginTop: 8 }}
              onClick={() => {
                if (rec.type === 'safety' && rec.targetAction) {
                  executeEloAction(rec.targetAction as EloAction, false)
                }
                routeFor(rec.targetScreen)
              }}
            >
              Open {rec.targetScreen}
            </button>
          </div>
        ))}

        <p className="elo-section-title">Memory & permissions</p>
        {permissions.map((permission) => (
          <div key={permission.key} className="elo-card">
            <h4>{permission.label}</h4>
            <p>{permission.description}</p>
            <label className="elo-toggle">
              <input
                type="checkbox"
                checked={permission.granted}
                onChange={() => {
                  const next = setEloPermission(permission.key, !permission.granted)
                  setPermissions(next)
                }}
              />
              <span>{permission.granted ? 'Enabled' : 'Disabled'}</span>
            </label>
          </div>
        ))}

        {memories.map((memory) => (
          <div key={memory.id} className="elo-card">
            <h4>{memory.memoryType.replaceAll('_', ' ')}</h4>
            <p>{JSON.stringify(memory.content)}</p>
          </div>
        ))}

        <div className="elo-card">
          <h4>Behavior snapshot</h4>
          <p>Preferred: {mockContentPreference.preferredCategories.join(', ')}</p>
        </div>
      </aside>
    </>
  )
}
