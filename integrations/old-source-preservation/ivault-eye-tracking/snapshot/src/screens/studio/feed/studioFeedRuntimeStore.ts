import type { MagicReveal } from "../studioTypes";
import type { PostPackage } from "../publish/studioPublishTypes";
import { createLedgerEntry, applyLedgerEntries } from "../wallet/studioWalletLedger";
import { simulateRevealUnlock } from "../wallet/studioUnlockEngine";
import type { StudioLedgerEntry, StudioRevealUnlock, StudioWalletAccount } from "../wallet/studioWalletTypes";
import { createMockStudioWalletAccounts } from "../wallet/studioWalletMockData";
import { calculateAttentionQuality, meetsVerifiedViewRule, recalcPostMetricsInPlace } from "./studioFeedAnalytics";
import {
  RUNTIME_STUDIO_SLOT_ID,
  createSeedRuntimePosts,
  buildRuntimePostFromPackage,
} from "./studioFeedMockData";
import type {
  CreatorPostDashboardState,
  RuntimePost,
  RuntimePostActionEvent,
  RuntimeUnlockSheetState,
  RuntimeViewerAction,
  RuntimeViewerSession,
} from "./studioFeedTypes";
import { updatePostStatus } from "./studioPostLifecycle";

const REPORT_THRESHOLD = 5;

function nowIso(): string {
  return new Date().toISOString();
}

function evId(): string {
  return `rfe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function postEligibilityFromRuntime(post: RuntimePost): { postId: string; verifiedViews: number; totalTips: number; publishedAt: string } {
  return {
    postId: post.id,
    verifiedViews: post.metrics.verifiedViews,
    totalTips: post.metrics.tips,
    publishedAt: post.publishedAt ?? post.createdAt,
  };
}

function pickWalletAccounts(accounts: StudioWalletAccount[]): {
  viewer: StudioWalletAccount;
  creator: StudioWalletAccount;
  platform: StudioWalletAccount;
  escrow: StudioWalletAccount;
  pool: StudioWalletAccount;
} {
  const viewer = accounts.find((a) => a.type === "viewer") ?? accounts[0]!;
  const creator = accounts.find((a) => a.type === "creator") ?? accounts[1]!;
  const platform = accounts.find((a) => a.type === "platform") ?? accounts[2]!;
  const escrow = accounts.find((a) => a.type === "escrow") ?? accounts[3]!;
  const pool = accounts.find((a) => a.type === "reward_pool") ?? accounts[4]!;
  return { viewer, creator, platform, escrow, pool };
}

function mergeWalletAccounts(base: StudioWalletAccount[], updates: StudioWalletAccount[]): StudioWalletAccount[] {
  const map = new Map(base.map((a) => [a.id, a]));
  for (const u of updates) map.set(u.id, u);
  return base.map((a) => map.get(a.id) ?? a);
}

export type RuntimeFeedState = {
  posts: RuntimePost[];
  activePostId: string | null;
  viewerSessions: Record<string, RuntimeViewerSession>;
  actionEvents: RuntimePostActionEvent[];
  selectedPostId: string | null;
  creatorDashboardOpen: boolean;
  creatorDashboard: CreatorPostDashboardState;
  runtimeWalletAccounts: StudioWalletAccount[];
  runtimeLedgerEntries: StudioLedgerEntry[];
  runtimeUnlocks: StudioRevealUnlock[];
  unlockSheet: RuntimeUnlockSheetState;
};

export const initialRuntimeFeedState: RuntimeFeedState = {
  posts: createSeedRuntimePosts(),
  activePostId: null,
  viewerSessions: {},
  actionEvents: [],
  selectedPostId: null,
  creatorDashboardOpen: false,
  creatorDashboard: {
    selectedPostId: null,
    timeRange: "seven_days",
    selectedMetric: "views",
    selectedRevealId: undefined,
  },
  runtimeWalletAccounts: createMockStudioWalletAccounts(),
  runtimeLedgerEntries: [],
  runtimeUnlocks: [],
  unlockSheet: { open: false },
};

export type RuntimeFeedAction =
  | { type: "LOAD_RUNTIME_POSTS"; posts: RuntimePost[] }
  | { type: "SET_ACTIVE_POST"; postId: string | null }
  | { type: "START_VIEWER_SESSION"; postId: string; viewerAccountId: string }
  | { type: "UPDATE_WATCH_TIME"; sessionId: string; deltaMs: number; durationMs: number; verifiedHuman: boolean }
  | { type: "END_VIEWER_SESSION"; sessionId: string }
  | { type: "RECORD_VIEWER_ACTION"; postId: string; viewerAccountId: string; action: RuntimeViewerAction; metadata?: Record<string, unknown>; revealId?: string; unlockId?: string; value?: number }
  | { type: "RECORD_VERIFIED_VIEW"; postId: string; viewerAccountId: string; sessionId: string }
  | { type: "LIKE_POST"; postId: string; viewerAccountId: string }
  | { type: "SAVE_POST"; postId: string; viewerAccountId: string }
  | { type: "SHARE_POST"; postId: string; viewerAccountId: string }
  | { type: "FOLLOW_CREATOR"; postId: string; viewerAccountId: string }
  | { type: "TIP_CREATOR"; postId: string; viewerAccountId: string; amount: number; coin?: import("../wallet/studioWalletTypes").StudioCoin }
  | { type: "TAP_MAGIC_REVEAL"; postId: string; viewerAccountId: string; revealId: string }
  | { type: "UNLOCK_MAGIC_REVEAL"; postId: string; viewerAccountId: string; revealId: string; amountOverride?: number }
  | { type: "REPORT_POST"; postId: string; viewerAccountId: string }
  | { type: "PASS_AGE_GATE"; postId: string; viewerAccountId: string; sessionId?: string }
  | { type: "ACKNOWLEDGE_DISCLOSURE"; postId: string; viewerAccountId: string; disclosureId: string; sessionId?: string }
  | { type: "UPDATE_POST_METRICS"; postId: string }
  | { type: "OPEN_CREATOR_DASHBOARD"; postId?: string | null }
  | { type: "CLOSE_CREATOR_DASHBOARD" }
  | { type: "UPDATE_POST_STATUS"; postId: string; status: RuntimePost["status"] }
  | { type: "ARCHIVE_POST"; postId: string }
  | { type: "PAUSE_POST"; postId: string }
  | { type: "DELETE_POST"; postId: string }
  | { type: "RESUME_POST"; postId: string }
  | { type: "SEND_TO_REVIEW"; postId: string }
  | { type: "SET_UNLOCK_SHEET"; sheet: RuntimeUnlockSheetState }
  | { type: "MERGE_PUBLISHED_STUDIO_POST"; postPackage: PostPackage; runtimePostId?: string };

function appendEvent(
  state: RuntimeFeedState,
  postId: string,
  viewerAccountId: string,
  action: RuntimeViewerAction,
  extra?: { revealId?: string; unlockId?: string; value?: number; metadata?: Record<string, unknown> }
): RuntimeFeedState {
  const evt: RuntimePostActionEvent = {
    id: evId(),
    postId,
    viewerAccountId,
    action,
    revealId: extra?.revealId,
    unlockId: extra?.unlockId,
    value: extra?.value,
    metadata: extra?.metadata ?? {},
    createdAt: nowIso(),
  };
  return { ...state, actionEvents: [...state.actionEvents, evt] };
}

function recalcAllPosts(state: RuntimeFeedState): RuntimePost[] {
  return state.posts.map((p) => recalcPostMetricsInPlace(p, state.actionEvents, state.runtimeUnlocks, state.runtimeLedgerEntries));
}

export function runtimeFeedReducer(state: RuntimeFeedState, action: RuntimeFeedAction): RuntimeFeedState {
  switch (action.type) {
    case "LOAD_RUNTIME_POSTS":
      return {
        ...state,
        posts: action.posts,
        activePostId: action.posts[0]?.id ?? null,
      };

    case "SET_ACTIVE_POST":
      return { ...state, activePostId: action.postId };

    case "START_VIEWER_SESSION": {
      /** Stable per post+viewer so UI can end sessions without reducer return values. */
      const sid = `sess_${action.postId}_${action.viewerAccountId}`;
      const session: RuntimeViewerSession = {
        id: sid,
        viewerAccountId: action.viewerAccountId,
        postId: action.postId,
        startedAt: nowIso(),
        watchMs: 0,
        attentionScore: 0,
        verified: false,
        actions: [],
        unlockIds: [],
        ageGatePassed: false,
        disclosureAcknowledged: false,
        impressionCounted: false,
        flagged: false,
      };
      let next: RuntimeFeedState = {
        ...state,
        viewerSessions: { ...state.viewerSessions, [sid]: session },
      };
      next = appendEvent(next, action.postId, action.viewerAccountId, "view", {
        metadata: { sessionId: sid, impression: true, watchMs: 0 },
      });
      next = { ...next, posts: recalcAllPosts(next) };
      return next;
    }

    case "UPDATE_WATCH_TIME": {
      const s = state.viewerSessions[action.sessionId];
      if (!s) return state;
      const watchMs = s.watchMs + action.deltaMs;
      const { attentionScore, verified } = calculateAttentionQuality({
        watchMs,
        durationMs: action.durationMs,
        verifiedHuman: action.verifiedHuman,
        flagged: s.flagged,
      });
      const session: RuntimeViewerSession = {
        ...s,
        watchMs,
        attentionScore,
        verified,
        actions: s.actions,
      };
      return {
        ...state,
        viewerSessions: { ...state.viewerSessions, [action.sessionId]: session },
      };
    }

    case "END_VIEWER_SESSION": {
      const s = state.viewerSessions[action.sessionId];
      if (!s) return state;
      const session: RuntimeViewerSession = { ...s, endedAt: nowIso() };
      let next: RuntimeFeedState = {
        ...state,
        viewerSessions: { ...state.viewerSessions, [action.sessionId]: session },
      };
      next = appendEvent(next, s.postId, s.viewerAccountId, "view", {
        metadata: {
          sessionId: action.sessionId,
          sessionEnd: true,
          watchMs: s.watchMs,
        },
      });
      next = { ...next, posts: recalcAllPosts(next) };
      return next;
    }

    case "RECORD_VERIFIED_VIEW": {
      let next = appendEvent(state, action.postId, action.viewerAccountId, "verified_view", {
        metadata: { sessionId: action.sessionId },
      });
      next = { ...next, posts: recalcAllPosts(next) };
      return next;
    }

    case "RECORD_VIEWER_ACTION": {
      const next = appendEvent(state, action.postId, action.viewerAccountId, action.action, {
        revealId: action.revealId,
        unlockId: action.unlockId,
        value: action.value,
        metadata: action.metadata ?? {},
      });
      return { ...next, posts: recalcAllPosts(next) };
    }

    case "LIKE_POST": {
      let next = appendEvent(state, action.postId, action.viewerAccountId, "like");
      next = { ...next, posts: recalcAllPosts(next) };
      return next;
    }
    case "SAVE_POST": {
      let next = appendEvent(state, action.postId, action.viewerAccountId, "save");
      next = { ...next, posts: recalcAllPosts(next) };
      return next;
    }
    case "SHARE_POST": {
      let next = appendEvent(state, action.postId, action.viewerAccountId, "share");
      next = { ...next, posts: recalcAllPosts(next) };
      return next;
    }
    case "FOLLOW_CREATOR": {
      let next = appendEvent(state, action.postId, action.viewerAccountId, "follow");
      next = { ...next, posts: recalcAllPosts(next) };
      return next;
    }

    case "TIP_CREATOR": {
      const post = state.posts.find((p) => p.id === action.postId);
      if (!post || post.status === "paused" || post.status === "under_review" || post.status === "blocked") return state;
      const { viewer, creator, platform } = pickWalletAccounts(state.runtimeWalletAccounts);
      const coin = action.coin ?? "iCoin";
      const amt = Math.max(0, action.amount);
      if (amt <= 0) return state;
      const fee = Math.round(amt * 0.12 * 100) / 100;
      const toCreator = Math.round((amt - fee) * 100) / 100;
      const unlockId = `tip_${evId()}`;
      const entries: StudioLedgerEntry[] = [
        createLedgerEntry({
          type: "magic_unlock_tip",
          status: "completed",
          coin,
          amount: amt,
          fromAccountId: viewer.id,
          toAccountId: creator.id,
          postId: post.id,
          unlockId,
          description: "Direct tip to creator (runtime)",
        }),
        createLedgerEntry({
          type: "magic_creator_pending_credit",
          status: "completed",
          coin,
          amount: toCreator,
          toAccountId: creator.id,
          postId: post.id,
          unlockId,
          description: "Tip — creator pending",
        }),
        createLedgerEntry({
          type: "magic_platform_fee",
          status: "completed",
          coin,
          amount: fee,
          toAccountId: platform.id,
          postId: post.id,
          unlockId,
          description: "Tip platform fee",
        }),
      ];
      const updatedAcc = applyLedgerEntries(state.runtimeWalletAccounts, entries);
      let next: RuntimeFeedState = {
        ...state,
        runtimeWalletAccounts: updatedAcc,
        runtimeLedgerEntries: [...state.runtimeLedgerEntries, ...entries],
      };
      next = appendEvent(next, action.postId, action.viewerAccountId, "tip", { value: amt, metadata: { coin } });
      next = { ...next, posts: recalcAllPosts(next) };
      return next;
    }

    case "TAP_MAGIC_REVEAL": {
      let next = appendEvent(state, action.postId, action.viewerAccountId, "magic_tap", {
        revealId: action.revealId,
        metadata: {},
      });
      next = { ...next, posts: recalcAllPosts(next) };
      return next;
    }

    case "UNLOCK_MAGIC_REVEAL": {
      const post = state.posts.find((p) => p.id === action.postId);
      if (!post) return state;
      if (post.status === "paused" || post.status === "under_review" || post.status === "blocked") return state;
      const reveal = post.postPackage.magicReveals.find((r) => r.id === action.revealId);
      if (!reveal) return state;

      const acc = pickWalletAccounts(state.runtimeWalletAccounts);
      const sim = simulateRevealUnlock({
        reveal,
        viewerAccount: acc.viewer,
        creatorAccount: acc.creator,
        platformAccount: acc.platform,
        escrowAccount: acc.escrow,
        rewardPoolAccount: acc.pool,
        post: postEligibilityFromRuntime(post),
        amountOverride: action.amountOverride,
        now: nowIso(),
        existingUnlocks: state.runtimeUnlocks.filter((u) => u.viewerAccountId === acc.viewer.id),
      });

      let next: RuntimeFeedState = {
        ...state,
        runtimeWalletAccounts: mergeWalletAccounts(state.runtimeWalletAccounts, sim.updatedAccounts),
        runtimeLedgerEntries: [...state.runtimeLedgerEntries, ...sim.ledgerEntries],
        runtimeUnlocks: sim.success ? [...state.runtimeUnlocks, sim.unlock] : state.runtimeUnlocks,
      };
      if (sim.success) {
        next = appendEvent(next, action.postId, action.viewerAccountId, "magic_unlock", {
          revealId: action.revealId,
          unlockId: sim.unlock.id,
          metadata: { resultMessage: sim.resultMessage },
        });
      }
      next = { ...next, posts: recalcAllPosts(next), unlockSheet: { open: false } };
      return next;
    }

    case "REPORT_POST": {
      let next = appendEvent(state, action.postId, action.viewerAccountId, "report");
      const evs = [...next.actionEvents];
      const reports = evs.filter((e) => e.postId === action.postId && e.action === "report").length;
      let posts = recalcAllPosts(next);
      if (reports > REPORT_THRESHOLD) {
        posts = posts.map((p) => (p.id === action.postId ? updatePostStatus(p, "under_review") : p));
      }
      return { ...next, posts };
    }

    case "PASS_AGE_GATE": {
      let next = state;
      if (action.sessionId && state.viewerSessions[action.sessionId]) {
        const s = state.viewerSessions[action.sessionId]!;
        next = {
          ...state,
          viewerSessions: {
            ...state.viewerSessions,
            [action.sessionId]: { ...s, ageGatePassed: true, actions: [...s.actions, "age_gate_passed" as RuntimeViewerAction] },
          },
        };
      }
      next = appendEvent(next, action.postId, action.viewerAccountId, "age_gate_passed");
      return { ...next, posts: recalcAllPosts(next) };
    }

    case "ACKNOWLEDGE_DISCLOSURE": {
      let next = appendEvent(state, action.postId, action.viewerAccountId, "disclosure_opened", {
        metadata: { disclosureId: action.disclosureId },
      });
      if (action.sessionId && next.viewerSessions[action.sessionId]) {
        const s = next.viewerSessions[action.sessionId]!;
        next = {
          ...next,
          viewerSessions: {
            ...next.viewerSessions,
            [action.sessionId]: { ...s, disclosureAcknowledged: true },
          },
        };
      }
      return { ...next, posts: recalcAllPosts(next) };
    }

    case "UPDATE_POST_METRICS":
      return { ...state, posts: recalcAllPosts(state) };

    case "OPEN_CREATOR_DASHBOARD":
      return {
        ...state,
        creatorDashboardOpen: true,
        selectedPostId: action.postId ?? state.activePostId,
        creatorDashboard: {
          ...state.creatorDashboard,
          selectedPostId: action.postId ?? state.activePostId ?? state.creatorDashboard.selectedPostId,
        },
      };

    case "CLOSE_CREATOR_DASHBOARD":
      return { ...state, creatorDashboardOpen: false };

    case "UPDATE_POST_STATUS": {
      const posts = state.posts.map((p) => (p.id === action.postId ? updatePostStatus(p, action.status) : p));
      return { ...state, posts };
    }

    case "ARCHIVE_POST": {
      const posts = state.posts.map((p) => (p.id === action.postId ? updatePostStatus(p, "archived") : p));
      return { ...state, posts };
    }

    case "PAUSE_POST": {
      const posts = state.posts.map((p) => (p.id === action.postId ? updatePostStatus(p, "paused") : p));
      return { ...state, posts };
    }

    case "DELETE_POST": {
      const posts = state.posts.map((p) => (p.id === action.postId ? updatePostStatus(p, "deleted") : p));
      return { ...state, posts };
    }

    case "RESUME_POST": {
      const posts = state.posts.map((p) => (p.id === action.postId ? updatePostStatus(p, "published") : p));
      return { ...state, posts };
    }

    case "SEND_TO_REVIEW": {
      const posts = state.posts.map((p) => (p.id === action.postId ? updatePostStatus(p, "under_review") : p));
      return { ...state, posts };
    }

    case "SET_UNLOCK_SHEET":
      return { ...state, unlockSheet: action.sheet };

    case "MERGE_PUBLISHED_STUDIO_POST": {
      const slotId = action.runtimePostId ?? RUNTIME_STUDIO_SLOT_ID;
      const newPost = buildRuntimePostFromPackage({
        id: slotId,
        postPackage: action.postPackage,
        creatorHandle: state.posts.find((p) => p.id === slotId)?.creatorHandle ?? "@studio",
        creatorName: state.posts.find((p) => p.id === slotId)?.creatorName ?? "Studio Creator",
        status: "published",
      });
      const hasSlot = state.posts.some((p) => p.id === slotId);
      const merged = hasSlot
        ? state.posts.map((p) => (p.id === slotId ? { ...newPost, id: slotId } : p))
        : [newPost, ...state.posts];
      return {
        ...state,
        posts: merged,
        activePostId: slotId,
      };
    }

    default:
      return state;
  }
}

/** Call from UI when watch time crosses verified threshold (single fire per session). */
export function shouldEmitVerifiedView(input: {
  session: RuntimeViewerSession;
  durationMs: number;
  verifiedHuman: boolean;
}): boolean {
  /** `session.verified` is attention “human / not flagged” from `calculateAttentionQuality`, not “verified view recorded”. */
  return meetsVerifiedViewRule({
    watchMs: input.session.watchMs,
    durationMs: input.durationMs,
    verifiedHuman: input.verifiedHuman,
    flagged: input.session.flagged,
    attentionScore: input.session.attentionScore,
  });
}

/** Isolated feed state for post-runtime preview (single post, clean sessions/ledger). */
export function runtimeFeedStateForSinglePost(post: RuntimePost): RuntimeFeedState {
  return {
    ...initialRuntimeFeedState,
    posts: [post],
    activePostId: post.id,
    selectedPostId: post.id,
    viewerSessions: {},
    actionEvents: [],
    runtimeLedgerEntries: [],
    runtimeUnlocks: [],
    unlockSheet: { open: false },
  };
}
