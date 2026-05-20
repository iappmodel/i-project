import { mockContextSnapshot, mockTrustState, mockWalletState } from '../mockData';
import type { EloContextSnapshot } from '../types';

export function getEloContext(screen: string): EloContextSnapshot {
  return {
    ...mockContextSnapshot,
    id: `ctx-${screen}`,
    screen,
    context: {
      ...mockContextSnapshot.context,
      currentScreen: screen,
      wallet: mockWalletState,
      trust: mockTrustState,
    },
  };
}

