export function formatCoinLabel(code: string): string {
  const normalized = code.trim().toLowerCase()
  if (!normalized) return ''
  return `${normalized.charAt(0).toUpperCase()}coin`
}

export function formatIcoinsAmount(n: number): string {
  return `+${n.toFixed(2)} ${formatCoinLabel('icoin')}`
}
