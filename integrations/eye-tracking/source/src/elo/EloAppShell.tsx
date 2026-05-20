'use client';

import { useMemo, useState } from 'react';
import { EloOrb, EloPanel } from './components/EloComponents';
import { getEloMemories } from './services/eloMemoryService';
import type { EloOrbState } from './types';

const SCREENS = ['feed', 'earn', 'wallet', 'profile', 'studio', 'campaign_builder'] as const;
type Screen = (typeof SCREENS)[number];

const orbByScreen: Record<Screen, EloOrbState> = {
  feed: 'hasInsight',
  earn: 'celebrating',
  wallet: 'warning',
  profile: 'idle',
  studio: 'thinking',
  campaign_builder: 'idle',
};

export function EloAppShell() {
  const [screen, setScreen] = useState<Screen>('feed');
  const [panelOpen, setPanelOpen] = useState(false);

  const memories = useMemo(() => getEloMemories(), []);
  const orbState = orbByScreen[screen];

  return (
    <main className="app-shell">
      <header className="shell-header">
        <h1>[ i ] Platform</h1>
        <p>ELO Stage 1 shell integration</p>
      </header>

      <nav className="shell-tabs">
        {SCREENS.map((item) => (
          <button
            key={item}
            className={item === screen ? 'active' : ''}
            onClick={() => setScreen(item)}
          >
            {item.replaceAll('_', ' ')}
          </button>
        ))}
      </nav>

      <section className="screen-card">
        <h2>{screen.replaceAll('_', ' ')}</h2>
        <p>Mocked screen surface. ELO orb is always available here.</p>
      </section>

      <EloOrb state={orbState} onClick={() => setPanelOpen(true)} />
      <EloPanel open={panelOpen} memories={memories} onClose={() => setPanelOpen(false)} onRoute={(s) => setScreen(s as Screen)} />
    </main>
  );
}

