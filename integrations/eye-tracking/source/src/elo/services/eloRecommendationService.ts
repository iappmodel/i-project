import { mockRecommendations } from '../mockData';
import type { EloRecommendation } from '../types';

export function getEloRecommendations(screen?: string): EloRecommendation[] {
  if (!screen) return [...mockRecommendations];
  return mockRecommendations.filter((r) => r.targetScreen === screen);
}

