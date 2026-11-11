import type { ProofPacketV0Json } from "./demoProofPacket"

/** Investor-safe summary — no raw eye-tracking payloads. */
export function summarizeProofPacket(packet: ProofPacketV0Json): {
  sessionId: string
  reviewStatus: string
  rewardEligibility: number
  signalIntegrity: number
  runtime: string
} {
  return {
    sessionId: packet.sessionId,
    reviewStatus: packet.review.status,
    rewardEligibility: packet.signals.rewardEligibility?.score ?? 0,
    signalIntegrity: packet.signals.signalIntegrity?.score ?? 0,
    runtime: packet.runtimeVersion,
  }
}
