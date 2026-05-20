import { mockMemories } from '../mockData';
import type { EloMemory } from '../types';

export function getEloMemories(): EloMemory[] {
  return [...mockMemories];
}

export function upsertEloMemory(memory: EloMemory): EloMemory[] {
  const existing = mockMemories.find((m) => m.id === memory.id);
  if (existing) {
    Object.assign(existing, memory);
  } else {
    mockMemories.push(memory);
  }
  return [...mockMemories];
}

