'use client';

import { useMemo, useState } from 'react';
import {
  mockContentPreference,
  mockCreatorInsight,
  mockEarningHistory,
  mockMessages,
  mockNotifications,
  mockPermissions,
  mockRecommendations,
  mockTrustState,
  mockWalletState,
} from '../mockData';
import { executeEloAction } from '../services/eloActionService';
import { setEloPermission } from '../services/eloPermissionService';
import type { EloAction, EloMemory, EloMessage, EloNotification, EloOrbState, EloPermission, EloRecommendation } from '../types';

const toneToClass: Record<string, string> = {
  earning: 'elo-tone-green',
  warning: 'elo-tone-amber',
  blocked: 'elo-tone-red',
  guidance: 'elo-tone-cyan',
  celebrate: 'elo-tone-green',
};

export function EloOrb({ state, onClick }: { state: EloOrbState; onClick: () => void }) {
  return (
    <button className={`elo-orb elo-orb-${state}`} onClick={onClick} aria-label="Open ELO">
      ELO
    </button>
  );
}

export function EloMessageBubble({ message }: { message: EloMessage }) {
  return <div className={`elo-bubble ${message.role === 'assistant' ? 'assistant' : 'user'}`}>{message.content}</div>;
}

export function EloChat({
  messages,
  onSend,
}: {
  messages: EloMessage[];
  onSend: (text: string) => void;
}) {
  const [draft, setDraft] = useState('');
  return (
    <section className="elo-card">
      <h3>Ask ELO</h3>
      <div className="elo-chat-list">
        {messages.map((message) => (
          <EloMessageBubble key={message.id} message={message} />
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          onSend(draft);
          setDraft('');
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask anything about wallet, trust, or earnings..." />
      </form>
    </section>
  );
}

export function EloInsightCard({ title, body, tone }: { title: string; body: string; tone: keyof typeof toneToClass }) {
  return (
    <article className={`elo-card ${toneToClass[tone]}`}>
      <h4>{title}</h4>
      <p>{body}</p>
    </article>
  );
}

export function EloRecommendationCard({
  recommendation,
  onAction,
}: {
  recommendation: EloRecommendation;
  onAction: (recommendation: EloRecommendation) => void;
}) {
  return (
    <article className="elo-card">
      <h4>{recommendation.title}</h4>
      <p>{recommendation.body}</p>
      <p className="elo-meta">
        {recommendation.urgency} urgency · {Math.round(recommendation.confidence * 100)}% confidence
      </p>
      <button onClick={() => onAction(recommendation)}>Open {recommendation.targetScreen}</button>
    </article>
  );
}

export function EloPermissionCard({
  permission,
  onToggle,
}: {
  permission: EloPermission;
  onToggle: (permission: EloPermission) => void;
}) {
  return (
    <article className="elo-card">
      <h4>{permission.label}</h4>
      <p>{permission.description}</p>
      <label className="elo-toggle">
        <input type="checkbox" checked={permission.granted} onChange={() => onToggle(permission)} />
        <span>{permission.granted ? 'Enabled' : 'Disabled'}</span>
      </label>
    </article>
  );
}

export function EloMemoryCard({ memory }: { memory: EloMemory }) {
  return (
    <article className="elo-card">
      <h4>{memory.memoryType.replaceAll('_', ' ')}</h4>
      <p>{JSON.stringify(memory.content)}</p>
      <p className="elo-meta">{memory.source} · {Math.round(memory.confidence * 100)}%</p>
    </article>
  );
}

export function EloActionConfirmSheet({
  action,
  onClose,
}: {
  action: EloAction | null;
  onClose: () => void;
}) {
  if (!action) return null;
  const result = executeEloAction(action, false);
  return (
    <div className="elo-sheet">
      <h3>Action review</h3>
      <p>{action.actionType.replaceAll('_', ' ')}</p>
      <p>{result.decision.body}</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

export function EloNotificationToast({ notification }: { notification: EloNotification | null }) {
  if (!notification) return null;
  return (
    <div className="elo-toast">
      <strong>{notification.title}</strong>
      <span>{notification.body}</span>
    </div>
  );
}

export function EloTodayBestMove() {
  return (
    <EloInsightCard
      title="Today's best move"
      body="A 5 iCoin GPS offer is nearby and expires today. It matches your strongest completion pattern."
      tone="earning"
    />
  );
}

export function EloWalletAdvisor() {
  return (
    <EloInsightCard
      title="Wallet intelligence"
      body={`Spendable ${mockWalletState.spendable} · Pending ${mockWalletState.pending} · ${mockWalletState.pendingLikelyClearingToday} pending likely to clear today.`}
      tone="guidance"
    />
  );
}

export function EloTrustAdvisor() {
  return (
    <EloInsightCard
      title="Trust progress"
      body={`Tier ${mockTrustState.tier} at ${Math.round(mockTrustState.progressToNextTier * 100)}% to Tier ${mockTrustState.nextTier}. ${mockTrustState.unlockHint}`}
      tone="guidance"
    />
  );
}

export function EloCreatorAdvisor() {
  return (
    <EloInsightCard
      title="Creator guidance"
      body={`${mockCreatorInsight.creator} aligns with your audience. Suggest saving for campaign and Studio ideation.`}
      tone="celebrate"
    />
  );
}

export function EloPanel({
  open,
  memories,
  onClose,
  onRoute,
}: {
  open: boolean;
  memories: EloMemory[];
  onClose: () => void;
  onRoute: (screen: string) => void;
}) {
  const [messages, setMessages] = useState<EloMessage[]>(mockMessages);
  const [permissions, setPermissions] = useState<EloPermission[]>(mockPermissions);
  const [action, setAction] = useState<EloAction | null>(null);
  const [toast, setToast] = useState<EloNotification | null>(null);

  const recentExplanations = useMemo(
    () => [
      'Withdrawal blocked by incomplete identity verification.',
      'GPS offers outperform watch offers for your profile.',
      'Trust tier progression can improve conversion value.',
    ],
    [],
  );

  if (!open) return null;
  return (
    <aside className="elo-panel">
      <header className="elo-panel-header">
        <div>
          <h2>ELO</h2>
          <p>Your personal intelligence</p>
        </div>
        <button onClick={onClose}>Close</button>
      </header>

      <EloChat
        messages={messages}
        onSend={(text) => {
          const userMessage: EloMessage = { id: `u-${Date.now()}`, role: 'user', content: text, createdAt: new Date().toISOString() };
          const assistantMessage: EloMessage = {
            id: `a-${Date.now() + 1}`,
            role: 'assistant',
            content: `I can help with that. Based on your current pattern, ${mockEarningHistory.bestCategory} remains your highest-value path today.`,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, userMessage, assistantMessage]);
        }}
      />

      <EloTodayBestMove />
      <EloWalletAdvisor />
      <EloTrustAdvisor />
      <EloCreatorAdvisor />

      <section className="elo-grid">
        {mockRecommendations.map((recommendation) => (
          <EloRecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
            onAction={(rec) => {
              onRoute(rec.targetScreen);
              setToast(mockNotifications[0]);
              if (rec.type === 'safety') {
                setAction({
                  id: 'action-1',
                  actionType: 'withdraw',
                  payload: { source: rec.id },
                  sensitivity: 'financial',
                  permissionRequired: true,
                });
              }
            }}
          />
        ))}
      </section>

      <section className="elo-card">
        <h3>Recent explanations</h3>
        <ul>
          {recentExplanations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="elo-card">
        <h3>Memory & permissions</h3>
        <div className="elo-grid">
          {permissions.map((permission) => (
            <EloPermissionCard
              key={permission.key}
              permission={permission}
              onToggle={(item) => {
                const next = setEloPermission(item.key, !item.granted);
                setPermissions(next);
              }}
            />
          ))}
        </div>
      </section>

      <section className="elo-grid">
        {memories.map((memory) => (
          <EloMemoryCard key={memory.id} memory={memory} />
        ))}
      </section>

      <section className="elo-card">
        <h3>Live behavior snapshot</h3>
        <p>Preferred categories: {mockContentPreference.preferredCategories.join(', ')}</p>
        <p>Skipped categories: {mockContentPreference.skippedCategories.join(', ')}</p>
      </section>

      <EloActionConfirmSheet action={action} onClose={() => setAction(null)} />
      <EloNotificationToast notification={toast} />
    </aside>
  );
}

