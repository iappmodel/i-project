/** ELO system doctrine — safety rails from rank 143 (non-negotiable) */

export interface DoctrineBlock {
  title: string
  reply: string
}

const BYPASS_PROOF = /\b(bypass|skip|fake|forge|cheat|hack)\b.*\b(proof|pop|pops|verify|verification|reward|session)\b/i
const CERTAINTY_ATTENTION = /\b(100%|guarantee|definitely|always)\b.*\b(attention|watching|focused|looking)\b/i
const REWARD_MANIPULATION = /\b(give me|grant|award|credit)\b.*\b(reward|coin|acoin|icoin|payout)\b/i

export function evaluateDoctrineInput(userText: string): DoctrineBlock | null {
  const lower = userText.trim().toLowerCase()
  if (!lower) return null

  if (BYPASS_PROOF.test(lower) || REWARD_MANIPULATION.test(lower)) {
    return {
      title: 'Proof boundary',
      reply:
        'I cannot bypass POP or proof gates — rewards only flow through verified attention. I can help you finish a verified watch the right way.',
    }
  }

  if (CERTAINTY_ATTENTION.test(lower)) {
    return {
      title: 'Attention humility',
      reply:
        'I read signals from POP, not certainty about your inner attention. Stay with the frame and let proof validate the session.',
    }
  }

  return null
}

export function applyDoctrineToReply(reply: string): string {
  let out = reply
  out = out.replace(/\b100%\s*(certain|sure)\b/gi, 'likely')
  out = out.replace(/\bguaranteed attention\b/gi, 'verified attention signals')
  out = out.replace(/\bI know exactly what you saw\b/gi, 'POP suggests what you engaged with')
  return out
}
