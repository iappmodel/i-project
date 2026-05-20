/** Display icoins like HTML prototypes (+2.00 icoins). */
export function formatIcoinsAmount(n: number): string {
  return `+${n.toFixed(2)} icoins`
}
