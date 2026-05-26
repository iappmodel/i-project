import type { ProofSealedEvent } from '../state/useProofEvents'

export interface EloCompanionCardProps {
  proofEventsConnected: boolean
  eloStatusLine: string
  lastProofEvent: ProofSealedEvent | null
  onViewWallet?: () => void
}

export function EloCompanionCard({
  proofEventsConnected,
  eloStatusLine,
  lastProofEvent,
  onViewWallet,
}: EloCompanionCardProps) {
  return (
    <section className="profile-section elo-companion-card">
      <h2 className="profile-section__title">Elo · companion</h2>
      <p className="profile-vision-card__body">
        POP is the senses of Elo — perception feeds continuity, memory, and guidance across loops.
      </p>
      <p className="profile-trust-card__hint mono" style={{ marginTop: 8 }}>
        {proofEventsConnected ? '● proof-events live' : '○ proof-events offline'} · {eloStatusLine}
      </p>
      {lastProofEvent ? (
        <p className="profile-trust-card__hint mono" style={{ marginTop: 4 }}>
          Last seal · {lastProofEvent.source} · {lastProofEvent.sessionId.slice(0, 16)}…
        </p>
      ) : null}
      <p className="profile-trust-card__hint mono" style={{ marginTop: 4 }}>
        POP senses → Proof → Wallet
      </p>
      {lastProofEvent && onViewWallet ? (
        <button type="button" className="sec-link-wu" onClick={onViewWallet} style={{ marginTop: 8 }}>
          View wallet for sealed proof
        </button>
      ) : null}
    </section>
  )
}
