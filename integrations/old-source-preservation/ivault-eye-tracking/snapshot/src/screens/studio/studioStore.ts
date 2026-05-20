import { useEffect, useMemo, useReducer, useRef } from "react";
import type { Dispatch } from "react";

import {
  appendStudioEvent,
  STUDIO_DISPUTE_EVENTS,
  STUDIO_EVENTS,
  STUDIO_FRAUD_EVENTS,
  STUDIO_MAGIC_EVENTS,
  STUDIO_POPS_EVENTS,
  STUDIO_POST_PACKAGE_EVENTS,
  STUDIO_PUBLISH_EVENTS,
  STUDIO_RIGHTS_PUBLISH_EVENTS,
  STUDIO_SAFETY_PUBLISH_EVENTS,
  STUDIO_SETTLEMENT_VERIFICATION_EVENTS,
  STUDIO_TRUST_EVENTS,
  STUDIO_UNLOCK_EVENTS,
  STUDIO_VERIFICATION_EVENTS,
  STUDIO_WALLET_EVENTS,
} from "./studioEvents";
import { createMockStudioSimPost, createMockStudioWalletAccounts } from "./wallet/studioWalletMockData";
import {
  mockRefundUnlock,
  mockReleaseSettlement,
  mockVerifyUnlock,
  simulateRevealUnlock,
} from "./wallet/studioUnlockEngine";
import type { StudioLedgerEntry, StudioWalletAccount } from "./wallet/studioWalletTypes";
import { applyMagicSafetyScanToReveal } from "./magic/magicSafetyRules";
import {
  createMockExportManifest,
  defaultPublishWalletState,
  publishProjectLocal,
  rebuildPublishDisclosures,
  runPublishValidation,
  runRightsScan,
  runSafetyScan,
} from "./publish/studioPublishEngine";
import { buildPostPackage } from "./publish/studioPostPackageBuilder";
import type {
  PostDisclosure,
  PostMonetizationMode,
  PostVisibility,
  PublishStatus,
  PublishTarget,
} from "./publish/studioPublishTypes";
import type { ApiResponse } from "./backend/studioApiTypes";
import { STUDIO_BACKEND_EVENTS } from "./backend/studioBackendEvents";
import type { PersistentMagicReveal } from "./backend/studioPersistenceTypes";
import { checkBackendHealth } from "./backend/studioBackendHealth";
import { mergeStudioBackendConfig, type StudioBackendConfig } from "./backend/studioBackendConfig";
import { resolveBackendMode, type BackendMode } from "./backend/studioBackendMode";
import { createDefaultMockPersistenceAdapter, StudioMockPersistenceAdapter } from "./backend/studioMockPersistenceAdapter";
import { createStudioPersistenceAdapter } from "./backend/studioPersistenceFactory";
import { StudioRepository } from "./backend/studioRepository";
import { resetSupabaseClientCache } from "../../lib/supabase/supabaseClient";
import { createMockStudioProject, studioExtensionDefaults } from "./studioMockData";
import type {
  AspectRatio,
  MagicReveal,
  MagicRevealGeometry,
  MagicPanelTab,
  StudioAsset,
  StudioAssetType,
  StudioCAFSegment,
  StudioClip,
  StudioExportSettings,
  StudioMode,
  StudioMonetizationRule,
  StudioProject,
  StudioProjectStatus,
  StudioBackendPanelTab,
  StudioSimPost,
  StudioState,
  StudioTextOverlay,
  StudioTool,
  StudioTrack,
  StudioUnlockVerificationSim,
  StudioUploadState,
  ViewerUnlockScenario,
} from "./studioTypes";
import type { RuntimePostActionEvent } from "./feed/studioFeedTypes";
import { assessFraudRisk } from "./verification/studioFraudEngine";
import {
  collectDisputeEvidence,
  createDispute,
  resolveDispute,
  type CreateDisputeInput,
  type DisputeResolution,
} from "./verification/studioDisputeEngine";
import {
  missingPOPSMethods,
  popsSatisfiedForCampaign,
  runMagicUnlockVerificationPipeline,
} from "./verification/studioMagicUnlockVerificationFlow";
import { createPOPSChallenge, evaluatePOPSChallenge, selectRequiredPOPS } from "./verification/studioPOPS";
import { applyTrustImpact, calculateTrustImpact } from "./verification/studioTrustImpact";
import { mockDisputes, mockPOPSChallenges, mockVerificationRecords } from "./verification/studioVerificationMockData";
import { verifyRuntimeAction, canReleaseCreatorSettlement } from "./verification/studioVerificationEngine";
import type { Dispute, POPSMethod } from "./verification/studioVerificationTypes";

export type StudioAction =
  | { type: "SET_MODE"; mode: StudioMode }
  | { type: "SET_ACTIVE_TOOL"; tool: StudioTool }
  | { type: "SET_ASPECT_RATIO"; aspectRatio: AspectRatio }
  | { type: "SET_PLAYHEAD"; playheadMs: number }
  | { type: "TOGGLE_PLAYBACK" }
  | { type: "SET_PLAYING"; isPlaying: boolean }
  | { type: "SELECT_CLIP"; clipId?: string }
  | { type: "SELECT_TRACK"; trackId?: string }
  | { type: "ADD_ASSET"; asset: StudioAsset }
  | { type: "MOCK_UPLOAD_ASSET"; asset: StudioAsset }
  | { type: "ADD_TRACK"; track: StudioTrack }
  | { type: "ADD_CLIP"; clip: StudioClip }
  | { type: "UPDATE_CLIP"; clipId: string; patch: Partial<StudioClip> }
  | { type: "TRIM_CLIP"; clipId: string; timelineStartMs: number; timelineEndMs: number }
  | { type: "SPLIT_CLIP"; clipId: string; atMs: number }
  | { type: "DELETE_CLIP"; clipId: string }
  | { type: "ADD_OVERLAY"; overlay: StudioTextOverlay }
  | { type: "UPDATE_OVERLAY"; overlayId: string; patch: Partial<StudioTextOverlay> }
  | { type: "TOGGLE_TRACK_VISIBILITY"; trackId: string }
  | { type: "TOGGLE_TRACK_LOCK"; trackId: string }
  | { type: "TOGGLE_TRACK_MUTE"; trackId: string }
  | { type: "SET_EXPORT_SETTINGS"; patch: Partial<StudioExportSettings> }
  | { type: "START_EXPORT" }
  | { type: "UPDATE_EXPORT_PROGRESS"; progress: number }
  | { type: "COMPLETE_EXPORT" }
  | { type: "SAVE_PROJECT" }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_INSPECTOR_OPEN"; open: boolean }
  | { type: "SET_UPLOAD_STATE"; uploadState: StudioUploadState }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "LOG_EVENT"; eventType: string; payload?: Record<string, unknown> }
  | { type: "SET_MAGIC_TAB"; tab: MagicPanelTab }
  | { type: "SET_MAGIC_TARGET"; target: string | null }
  | { type: "CREATE_MAGIC_REVEAL"; reveal: MagicReveal }
  | { type: "UPDATE_MAGIC_REVEAL"; id: string; patch: Partial<MagicReveal> }
  | { type: "DELETE_MAGIC_REVEAL"; id: string }
  | { type: "DUPLICATE_MAGIC_REVEAL"; id: string }
  | { type: "SELECT_MAGIC_REVEAL"; id?: string }
  | { type: "RUN_MAGIC_SAFETY_SCAN" }
  | { type: "SET_PREVIEW_UNLOCK_SHEET"; open: boolean; scenario?: ViewerUnlockScenario }
  | { type: "OPEN_PREVIEW_UNLOCK_SHEET" }
  | { type: "CLOSE_PREVIEW_UNLOCK_SHEET" }
  | { type: "UPDATE_MAGIC_HIDDEN_RENDER"; id: string; hiddenRender: MagicReveal["hiddenRender"] }
  | { type: "UPDATE_MAGIC_GEOMETRY"; id: string; geometry: MagicRevealGeometry }
  | { type: "UPDATE_MAGIC_TRACKING"; id: string; tracking: MagicReveal["tracking"] }
  | { type: "UPDATE_MAGIC_TARGET_TYPE"; id: string; targetType: MagicReveal["targetType"] }
  | { type: "UPDATE_MAGIC_REVEAL_TYPE"; id: string; revealType: MagicReveal["revealType"] }
  | { type: "UPDATE_MAGIC_PRICING"; id: string; pricing: MagicReveal["pricing"] }
  | { type: "UPDATE_MAGIC_REWARD"; id: string; reward: MagicReveal["reward"] }
  | { type: "UPDATE_MAGIC_ELIGIBILITY"; id: string; eligibility: MagicReveal["eligibility"] }
  | { type: "UPDATE_MAGIC_UNLOCK_POLICY"; id: string; unlockPolicy: MagicReveal["unlockPolicy"] }
  | { type: "UPDATE_MONETIZATION"; patch: Partial<StudioMonetizationRule> }
  | { type: "RUN_RIGHTS_SCAN" }
  | { type: "RUN_SAFETY_SCAN" }
  | { type: "ADD_CAF"; segment: StudioCAFSegment }
  | { type: "UPDATE_CAF"; id: string; patch: Partial<StudioCAFSegment> }
  | { type: "SET_PUBLISH_TARGET"; publishTarget: PublishTarget }
  | { type: "SET_POST_VISIBILITY"; visibility: PostVisibility }
  | { type: "SET_POST_CAPTION"; caption: string }
  | { type: "SET_POST_HASHTAGS"; hashtags: string[] }
  | { type: "SET_MONETIZATION_MODE"; monetizationMode: PostMonetizationMode }
  | { type: "RUN_PUBLISH_VALIDATION" }
  | { type: "BUILD_POST_PACKAGE" }
  | { type: "OPEN_PUBLISH_PANEL" }
  | { type: "CLOSE_PUBLISH_PANEL" }
  | { type: "OPEN_RUNTIME_PREVIEW" }
  | { type: "CLOSE_RUNTIME_PREVIEW" }
  | { type: "OPEN_SAFETY_REPORT_PANEL" }
  | { type: "CLOSE_SAFETY_REPORT_PANEL" }
  | { type: "OPEN_RIGHTS_REPORT_PANEL" }
  | { type: "CLOSE_RIGHTS_REPORT_PANEL" }
  | { type: "UPDATE_DISCLOSURE"; id: string; patch: Partial<PostDisclosure> }
  | { type: "ACCEPT_DISCLOSURE_REQUIREMENT"; id: string }
  | { type: "PUBLISH_PROJECT" }
  | { type: "OPEN_UNLOCK_SIMULATOR" }
  | { type: "CLOSE_UNLOCK_SIMULATOR" }
  | { type: "SIMULATE_REVEAL_UNLOCK"; revealId: string; amountOverride?: number }
  | { type: "CONFIRM_REVEAL_UNLOCK"; revealId: string; amountOverride?: number }
  | { type: "MOCK_VERIFY_UNLOCK"; unlockId: string }
  | { type: "MOCK_RELEASE_SETTLEMENT"; unlockId: string }
  | { type: "MOCK_REFUND_UNLOCK"; unlockId: string }
  | { type: "SELECT_UNLOCK"; id?: string }
  | { type: "OPEN_WALLET_PANEL" }
  | { type: "CLOSE_WALLET_PANEL" }
  | { type: "SET_SETTLEMENT_SUMMARY_OPEN"; open: boolean }
  | { type: "ADD_LEDGER_ENTRIES"; entries: StudioLedgerEntry[] }
  | { type: "UPDATE_WALLET_ACCOUNTS"; accounts: StudioWalletAccount[] }
  | { type: "SET_BACKEND_SYNC_STATUS"; status: StudioState["backendSyncStatus"] }
  | { type: "LOG_BACKEND_EVENT"; eventType: string; payload?: Record<string, unknown> }
  | { type: "SET_PERSISTED_SNAPSHOT_META"; meta: StudioState["persistedSnapshotMeta"] }
  | { type: "SET_SELECTED_BACKEND_PANEL"; tab: StudioBackendPanelTab }
  | { type: "SET_BACKEND_MODE"; mode: BackendMode }
  | { type: "SET_BACKEND_CONFIG"; patch: Partial<StudioBackendConfig> }
  | { type: "CHECK_BACKEND_HEALTH" }
  | { type: "INITIALIZE_PERSISTENCE_ADAPTER" }
  | { type: "HYDRATE_PROJECT"; project: StudioProject }
  | { type: "OPEN_VERIFICATION_PANEL" }
  | { type: "CLOSE_VERIFICATION_PANEL" }
  | { type: "OPEN_RISK_MONITOR" }
  | { type: "CLOSE_RISK_MONITOR" }
  | { type: "SELECT_VERIFICATION_RECORD"; id?: string }
  | { type: "SELECT_DISPUTE"; id?: string }
  | { type: "SET_UNLOCK_VERIFICATION_SIM"; patch: Partial<StudioUnlockVerificationSim> }
  | { type: "CREATE_POPS_CHALLENGE"; method: POPSMethod; revealId?: string; campaignId?: string }
  | { type: "COMPLETE_POPS_CHALLENGE"; challengeId: string; passed: boolean }
  | { type: "EXPIRE_POPS_CHALLENGE"; challengeId: string }
  | { type: "CREATE_DISPUTE"; input: Omit<CreateDisputeInput, "nowIso"> }
  | { type: "COLLECT_DISPUTE_EVIDENCE"; disputeId: string }
  | { type: "RESOLVE_DISPUTE"; disputeId: string; resolution: DisputeResolution }
  | { type: "APPLY_TRUST_IMPACT_MOCK"; verificationId?: string; fraudAssessmentId?: string }
  | { type: "COMPLETE_CAMPAIGN_ACTION_MOCK" }
  | { type: "OPEN_BACKEND_PANEL" }
  | { type: "CLOSE_BACKEND_PANEL" };

const MAX_HISTORY = 50;

/** Stage 9 — rebuild config, health, adapter, repository from env + optional overrides. */
function applyBackendPersistenceState(override?: Partial<StudioBackendConfig>): Pick<
  StudioState,
  "backendConfig" | "backendHealth" | "activeBackendMode" | "supabaseConfigured" | "persistenceAdapter" | "repository"
> {
  const backendConfig = mergeStudioBackendConfig(override);
  const backendHealth = checkBackendHealth(backendConfig);
  const persistenceAdapter = createStudioPersistenceAdapter(backendConfig);
  const repository = new StudioRepository(persistenceAdapter);
  return {
    backendConfig,
    backendHealth,
    activeBackendMode: resolveBackendMode({
      mode: backendConfig.mode,
      supabaseConfigured: backendConfig.supabaseConfigured,
      enablePersistence: backendConfig.enablePersistence,
    }),
    supabaseConfigured: backendConfig.supabaseConfigured,
    persistenceAdapter,
    repository,
  };
}

function cloneProject(p: StudioProject): StudioProject {
  return JSON.parse(JSON.stringify(p)) as StudioProject;
}

function withEvent(
  s: StudioState,
  type: string,
  payload?: Record<string, unknown>
): StudioState {
  return {
    ...s,
    events: appendStudioEvent(s.events, s.project.id, type, payload),
  };
}

function accountByType(
  accounts: StudioWalletAccount[],
  type: StudioWalletAccount["type"]
): StudioWalletAccount | undefined {
  return accounts.find((a) => a.type === type);
}

/** Merge simulator account updates by id (order preserved from `current`). */
function mergeWalletAccounts(
  current: StudioWalletAccount[],
  updated: StudioWalletAccount[]
): StudioWalletAccount[] {
  const map = new Map(updated.map((a) => [a.id, a]));
  return current.map((a) => map.get(a.id) ?? a);
}

function pushHistory(s: StudioState): StudioState {
  const snap = cloneProject(s.project);
  return {
    ...s,
    history: [...s.history, snap].slice(-MAX_HISTORY),
    future: [],
  };
}

function patchMagicReveal(
  s: StudioState,
  id: string,
  map: (m: MagicReveal) => MagicReveal,
  eventType: string,
  payload?: Record<string, unknown>
): StudioState {
  const s0 = pushHistory(s);
  const now = new Date().toISOString();
  const magicReveals = s0.project.magicReveals.map((m) => (m.id === id ? { ...map(m), updatedAt: now } : m));
  const project = { ...s0.project, magicReveals, updatedAt: now };
  return withEvent({ ...s0, project }, eventType, { id, ...payload });
}

export function createInitialStudioState(): StudioState {
  const project = createMockStudioProject();
  const studioSimPost: StudioSimPost = createMockStudioSimPost();
  const persistenceBundle = applyBackendPersistenceState();
  return {
    project,
    history: [],
    future: [],
    events: appendStudioEvent([], project.id, STUDIO_EVENTS.projectOpened, { title: project.title }),
    uploadState: { phase: "idle" },
    inspectorOpen: true,
    publishPanelOpen: false,
    safetyReportPanelOpen: false,
    rightsReportPanelOpen: false,
    runtimePreviewOpen: false,
    runtimePreviewPackage: null,
    studioSimPost,
    walletAccounts: createMockStudioWalletAccounts(),
    ledgerEntries: [],
    unlocks: [],
    selectedUnlockId: undefined,
    unlockSimulatorOpen: false,
    walletPanelOpen: false,
    settlementSummaryOpen: false,
    ...persistenceBundle,
    backendReadinessOpen: false,
    persistedSnapshotMeta: null,
    backendSyncStatus: "idle",
    backendEvents: [],
    selectedBackendPanel: "connection",
    verificationRecords: [],
    fraudAssessments: [],
    popsChallenges: [],
    disputes: [],
    selectedVerificationId: undefined,
    selectedDisputeId: undefined,
    verificationPanelOpen: false,
    riskMonitorOpen: false,
    studioCampaignClaimKeys: [],
    unlockVerificationSim: {
      watchMs: 12_000,
      attentionScore: 0.82,
      ageGatePassed: true,
      disclosureAcknowledged: true,
      locationMatch: true,
      qrScanned: true,
      sessionFlagged: false,
    },
    lastConfirmUnlockMessage: undefined,
  };
}

function seedTimelineForNewAsset(p: StudioProject, asset: StudioAsset): StudioProject {
  const durationMs = asset.durationMs ?? 30_000;
  const projectId = p.id;
  const t = new Date().toISOString();
  const videoTrack: StudioTrack = {
    id: `tr_video_${Date.now()}`,
    projectId,
    type: "video",
    name: "Main Video",
    sortOrder: 0,
    locked: false,
    muted: false,
    visible: true,
  };
  const audioTrack: StudioTrack = {
    id: `tr_audio_${Date.now()}`,
    projectId,
    type: "audio",
    name: "Audio",
    sortOrder: 1,
    locked: false,
    muted: false,
    visible: true,
  };
  const clipVideo: StudioClip = {
    id: `clip_${Date.now()}_v`,
    projectId,
    trackId: videoTrack.id,
    assetId: asset.id,
    type: "video",
    name: asset.name,
    timelineStartMs: 0,
    timelineEndMs: durationMs,
    sourceStartMs: 0,
    sourceEndMs: durationMs,
    color: "#5eead4",
    locked: false,
    muted: false,
    visible: true,
    transform: {},
    effects: {},
  };
  const tracks: StudioTrack[] = asset.type === "audio" ? [audioTrack] : [videoTrack];
  const clips: StudioClip[] =
    asset.type === "audio"
      ? [
          {
            id: `clip_${Date.now()}_a`,
            projectId,
            trackId: audioTrack.id,
            assetId: asset.id,
            type: "audio",
            name: asset.name,
            timelineStartMs: 0,
            timelineEndMs: durationMs,
            sourceStartMs: 0,
            sourceEndMs: durationMs,
            color: "#fbbf24",
            locked: false,
            muted: false,
            visible: true,
            transform: {},
            effects: { volume: 1 },
          },
        ]
      : [clipVideo];

  const baseExt = p.status === "empty" ? studioExtensionDefaults() : {};
  return {
    ...p,
    ...baseExt,
    title: asset.name,
    status: "draft",
    durationMs,
    assets: [...p.assets, { ...asset, createdAt: asset.createdAt || t }],
    tracks,
    clips,
    selectedClipId: clips[0]?.id,
    selectedTrackId: tracks[0]?.id,
    playheadMs: 0,
    publishValidationErrors: undefined,
    updatedAt: t,
  };
}

export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  const pid = state.project.id;

  switch (action.type) {
    case "SET_MODE": {
      const project = { ...state.project, mode: action.mode, updatedAt: new Date().toISOString() };
      return withEvent({ ...state, project }, STUDIO_EVENTS.modeChanged, { mode: action.mode });
    }

    case "SET_ACTIVE_TOOL": {
      const project = {
        ...state.project,
        activeTool: action.tool,
        updatedAt: new Date().toISOString(),
      };
      let next = withEvent({ ...state, project }, STUDIO_EVENTS.toolSelected, { tool: action.tool });
      if (action.tool === "magic") {
        next = withEvent(next, STUDIO_MAGIC_EVENTS.opened, {});
      }
      if (action.tool === "publish") {
        next = withEvent(
          { ...next, publishPanelOpen: true, inspectorOpen: true },
          STUDIO_PUBLISH_EVENTS.panelOpened,
          {}
        );
      }
      if (action.tool === "runtime_feed" || action.tool === "creator_dashboard") {
        next = { ...next, inspectorOpen: true };
      }
      if (action.tool === "backend") {
        next = {
          ...next,
          inspectorOpen: true,
          backendReadinessOpen: true,
        };
      }
      if (action.tool === "verify") {
        next = {
          ...next,
          inspectorOpen: true,
          verificationPanelOpen: true,
        };
        if (next.verificationRecords.length === 0 && next.disputes.length === 0 && next.popsChallenges.length === 0) {
          next = {
            ...next,
            verificationRecords: [...mockVerificationRecords],
            popsChallenges: [...mockPOPSChallenges],
            disputes: [...mockDisputes],
          };
        }
      }
      return next;
    }

    case "SET_ASPECT_RATIO": {
      const project = {
        ...state.project,
        aspectRatio: action.aspectRatio,
        exportSettings: { ...state.project.exportSettings, aspectRatio: action.aspectRatio },
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...state, project }, STUDIO_EVENTS.aspectChanged, {
        aspectRatio: action.aspectRatio,
      });
    }

    case "SET_PLAYHEAD": {
      const ms = Math.max(0, Math.min(action.playheadMs, state.project.durationMs || 0));
      const project = { ...state.project, playheadMs: ms, updatedAt: new Date().toISOString() };
      return withEvent({ ...state, project }, STUDIO_EVENTS.playheadChanged, { playheadMs: ms });
    }

    case "TOGGLE_PLAYBACK": {
      const next = !state.project.isPlaying;
      const project = { ...state.project, isPlaying: next, updatedAt: new Date().toISOString() };
      return withEvent(
        { ...state, project },
        next ? STUDIO_EVENTS.playbackStarted : STUDIO_EVENTS.playbackPaused,
        {}
      );
    }

    case "SET_PLAYING": {
      const project = { ...state.project, isPlaying: action.isPlaying, updatedAt: new Date().toISOString() };
      return withEvent(
        { ...state, project },
        action.isPlaying ? STUDIO_EVENTS.playbackStarted : STUDIO_EVENTS.playbackPaused,
        {}
      );
    }

    case "SELECT_CLIP": {
      const project = {
        ...state.project,
        selectedClipId: action.clipId,
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...state, project }, STUDIO_EVENTS.clipSelected, { clipId: action.clipId });
    }

    case "SELECT_TRACK": {
      const project = {
        ...state.project,
        selectedTrackId: action.trackId,
        updatedAt: new Date().toISOString(),
      };
      return { ...state, project };
    }

    case "SET_ZOOM": {
      const project = { ...state.project, zoom: action.zoom, updatedAt: new Date().toISOString() };
      return { ...state, project };
    }

    case "SET_INSPECTOR_OPEN":
      return { ...state, inspectorOpen: action.open };

    case "SET_UPLOAD_STATE":
      return { ...state, uploadState: action.uploadState };

    case "ADD_ASSET": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        assets: [...s0.project.assets, action.asset],
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, STUDIO_EVENTS.assetUploadCompleted, { assetId: action.asset.id });
    }

    case "MOCK_UPLOAD_ASSET": {
      const s0 = pushHistory({ ...state, uploadState: { phase: "uploading", message: action.asset.name } });
      let events = appendStudioEvent(s0.events, s0.project.id, STUDIO_EVENTS.assetUploadStarted, {
        name: action.asset.name,
      });
      let project = { ...s0.project };
      if (project.status === "empty") {
        project = seedTimelineForNewAsset(project, action.asset);
      } else {
        project = {
          ...project,
          assets: [...project.assets, action.asset],
          status: project.status,
          updatedAt: new Date().toISOString(),
        };
      }
      events = appendStudioEvent(events, project.id, STUDIO_EVENTS.assetUploadCompleted, {
        assetId: action.asset.id,
      });
      return {
        ...s0,
        project,
        events,
        uploadState: { phase: "uploaded", message: action.asset.name },
      };
    }

    case "ADD_TRACK": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        tracks: [...s0.project.tracks, action.track],
        updatedAt: new Date().toISOString(),
      };
      return { ...s0, project };
    }

    case "ADD_CLIP": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        clips: [...s0.project.clips, action.clip],
        updatedAt: new Date().toISOString(),
      };
      return { ...s0, project };
    }

    case "UPDATE_CLIP": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        clips: s0.project.clips.map((c) => (c.id === action.clipId ? { ...c, ...action.patch } : c)),
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, STUDIO_EVENTS.clipUpdated, { clipId: action.clipId, patch: action.patch });
    }

    case "TRIM_CLIP": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        clips: s0.project.clips.map((c) =>
          c.id === action.clipId
            ? {
                ...c,
                timelineStartMs: action.timelineStartMs,
                timelineEndMs: action.timelineEndMs,
              }
            : c
        ),
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, STUDIO_EVENTS.clipTrimmed, {
        clipId: action.clipId,
        timelineStartMs: action.timelineStartMs,
        timelineEndMs: action.timelineEndMs,
      });
    }

    case "SPLIT_CLIP": {
      const clip = state.project.clips.find((c) => c.id === action.clipId);
      if (!clip || action.atMs <= clip.timelineStartMs || action.atMs >= clip.timelineEndMs) return state;
      const s0 = pushHistory(state);
      const newId = `clip_${Date.now()}_b`;
      const left: StudioClip = { ...clip, timelineEndMs: action.atMs, sourceEndMs: action.atMs };
      const right: StudioClip = {
        ...clip,
        id: newId,
        name: `${clip.name} (2)`,
        timelineStartMs: action.atMs,
        timelineEndMs: clip.timelineEndMs,
        sourceStartMs: action.atMs,
        sourceEndMs: clip.sourceEndMs,
      };
      const project = {
        ...s0.project,
        clips: s0.project.clips.map((c) => (c.id === action.clipId ? left : c)).concat(right),
        selectedClipId: newId,
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, STUDIO_EVENTS.clipSplit, { clipId: action.clipId, atMs: action.atMs });
    }

    case "DELETE_CLIP": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        clips: s0.project.clips.filter((c) => c.id !== action.clipId),
        selectedClipId: s0.project.selectedClipId === action.clipId ? undefined : s0.project.selectedClipId,
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, STUDIO_EVENTS.clipDeleted, { clipId: action.clipId });
    }

    case "ADD_OVERLAY": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        overlays: [...s0.project.overlays, action.overlay],
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, "studio.text.overlay_added", { overlayId: action.overlay.id });
    }

    case "UPDATE_OVERLAY": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        overlays: s0.project.overlays.map((o) => (o.id === action.overlayId ? { ...o, ...action.patch } : o)),
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, "studio.text.overlay_updated", { overlayId: action.overlayId });
    }

    case "TOGGLE_TRACK_VISIBILITY": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        tracks: s0.project.tracks.map((t) =>
          t.id === action.trackId ? { ...t, visible: !t.visible } : t
        ),
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, STUDIO_EVENTS.trackVisibilityChanged, { trackId: action.trackId });
    }

    case "TOGGLE_TRACK_LOCK": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        tracks: s0.project.tracks.map((t) => (t.id === action.trackId ? { ...t, locked: !t.locked } : t)),
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, STUDIO_EVENTS.trackLockChanged, { trackId: action.trackId });
    }

    case "TOGGLE_TRACK_MUTE": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        tracks: s0.project.tracks.map((t) => (t.id === action.trackId ? { ...t, muted: !t.muted } : t)),
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, STUDIO_EVENTS.trackMuteChanged, { trackId: action.trackId });
    }

    case "SET_EXPORT_SETTINGS": {
      const project = {
        ...state.project,
        exportSettings: { ...state.project.exportSettings, ...action.patch },
        updatedAt: new Date().toISOString(),
      };
      return { ...state, project };
    }

    case "START_EXPORT": {
      const exportStatus = "exporting" as const;
      const projectStatus: StudioProjectStatus = "exporting";
      const project: StudioProject = {
        ...state.project,
        activeTool: "export",
        exportSettings: {
          ...state.project.exportSettings,
          status: exportStatus,
          progress: 0,
        },
        status: projectStatus,
        publishStatus: "exporting",
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...state, project }, STUDIO_EVENTS.exportStarted, {});
    }

    case "UPDATE_EXPORT_PROGRESS": {
      const project = {
        ...state.project,
        exportSettings: {
          ...state.project.exportSettings,
          progress: Math.min(100, Math.max(0, action.progress)),
        },
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...state, project }, STUDIO_EVENTS.exportProgress, { progress: action.progress });
    }

    case "COMPLETE_EXPORT": {
      const exportManifest = createMockExportManifest(state.project);
      const project: StudioProject = {
        ...state.project,
        status: "exported",
        exportSettings: {
          ...state.project.exportSettings,
          status: "completed",
          progress: 100,
        },
        exportManifest,
        publishStatus: "exported",
        updatedAt: new Date().toISOString(),
      };
      let events = appendStudioEvent(state.events, pid, STUDIO_EVENTS.exportCompleted, {});
      events = appendStudioEvent(events, pid, STUDIO_POST_PACKAGE_EVENTS.manifestCreated, {
        renderId: exportManifest.renderId,
      });
      return { ...state, project, events };
    }

    case "SAVE_PROJECT": {
      const nextStatus: StudioProjectStatus = state.project.status === "empty" ? "draft" : "saved";
      const project: StudioProject = {
        ...state.project,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...state, project }, STUDIO_EVENTS.projectSaved, {});
    }

    case "UNDO": {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1]!;
      const newHistory = state.history.slice(0, -1);
      const current = cloneProject(state.project);
      return {
        ...state,
        project: prev,
        history: newHistory,
        future: [current, ...state.future],
        events: appendStudioEvent(state.events, pid, "studio.history.undo", {}),
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const [next, ...rest] = state.future;
      const current = cloneProject(state.project);
      return {
        ...state,
        project: next!,
        history: [...state.history, current],
        future: rest,
        events: appendStudioEvent(state.events, pid, "studio.history.redo", {}),
      };
    }

    case "LOG_EVENT":
      return withEvent(state, action.eventType, action.payload);

    case "SET_MAGIC_TAB": {
      const project = { ...state.project, magicPanelTab: action.tab, updatedAt: new Date().toISOString() };
      return withEvent({ ...state, project }, STUDIO_MAGIC_EVENTS.tabChanged, { tab: action.tab });
    }

    case "SET_MAGIC_TARGET": {
      const project = {
        ...state.project,
        magicTargetSelection: action.target,
        updatedAt: new Date().toISOString(),
      };
      return { ...state, project };
    }

    case "CREATE_MAGIC_REVEAL": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        magicReveals: [...s0.project.magicReveals, action.reveal],
        selectedMagicRevealId: action.reveal.id,
        activeTool: "magic" as StudioTool,
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, STUDIO_MAGIC_EVENTS.revealCreated, { id: action.reveal.id });
    }

    case "UPDATE_MAGIC_REVEAL": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        magicReveals: s0.project.magicReveals.map((m) =>
          m.id === action.id ? { ...m, ...action.patch, updatedAt: new Date().toISOString() } : m
        ),
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, STUDIO_MAGIC_EVENTS.revealUpdated, { id: action.id });
    }

    case "DELETE_MAGIC_REVEAL": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        magicReveals: s0.project.magicReveals.map((m) =>
          m.id === action.id ? { ...m, status: "deleted" as const, updatedAt: new Date().toISOString() } : m
        ),
        selectedMagicRevealId: s0.project.selectedMagicRevealId === action.id ? undefined : s0.project.selectedMagicRevealId,
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, STUDIO_MAGIC_EVENTS.revealDeleted, { id: action.id });
    }

    case "DUPLICATE_MAGIC_REVEAL": {
      const src = state.project.magicReveals.find((m) => m.id === action.id);
      if (!src || src.status === "deleted") return state;
      const s0 = pushHistory(state);
      const nid = `magic_${Date.now()}`;
      const copy: MagicReveal = {
        ...src,
        id: nid,
        name: `${src.name} (copy)`,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const project = {
        ...s0.project,
        magicReveals: [...s0.project.magicReveals, copy],
        selectedMagicRevealId: nid,
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, STUDIO_MAGIC_EVENTS.revealDuplicated, { from: action.id, id: nid });
    }

    case "SELECT_MAGIC_REVEAL": {
      const project = {
        ...state.project,
        selectedMagicRevealId: action.id,
        activeTool: (action.id ? "magic" : state.project.activeTool) as StudioTool,
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...state, project }, STUDIO_MAGIC_EVENTS.revealSelected, { id: action.id });
    }

    case "UPDATE_MAGIC_HIDDEN_RENDER": {
      return patchMagicReveal(
        state,
        action.id,
        (m) => ({ ...m, hiddenRender: action.hiddenRender }),
        STUDIO_MAGIC_EVENTS.hiddenRenderChanged,
        { mode: action.hiddenRender.mode }
      );
    }

    case "UPDATE_MAGIC_GEOMETRY": {
      return patchMagicReveal(state, action.id, (m) => ({ ...m, geometry: action.geometry }), STUDIO_MAGIC_EVENTS.revealUpdated, {
        field: "geometry",
      });
    }

    case "UPDATE_MAGIC_TRACKING": {
      return patchMagicReveal(state, action.id, (m) => ({ ...m, tracking: action.tracking }), STUDIO_MAGIC_EVENTS.revealUpdated, {
        field: "tracking",
      });
    }

    case "UPDATE_MAGIC_TARGET_TYPE": {
      return patchMagicReveal(state, action.id, (m) => ({ ...m, targetType: action.targetType }), STUDIO_MAGIC_EVENTS.revealUpdated, {
        field: "targetType",
      });
    }

    case "UPDATE_MAGIC_REVEAL_TYPE": {
      return patchMagicReveal(state, action.id, (m) => ({ ...m, revealType: action.revealType }), STUDIO_MAGIC_EVENTS.revealTypeChanged, {
        revealType: action.revealType,
      });
    }

    case "UPDATE_MAGIC_PRICING": {
      return patchMagicReveal(state, action.id, (m) => ({ ...m, pricing: action.pricing }), STUDIO_MAGIC_EVENTS.priceChanged, {});
    }

    case "UPDATE_MAGIC_REWARD": {
      return patchMagicReveal(state, action.id, (m) => ({ ...m, reward: action.reward }), STUDIO_MAGIC_EVENTS.rewardChanged, {});
    }

    case "UPDATE_MAGIC_ELIGIBILITY": {
      return patchMagicReveal(state, action.id, (m) => ({ ...m, eligibility: action.eligibility }), STUDIO_MAGIC_EVENTS.eligibilityChanged, {});
    }

    case "UPDATE_MAGIC_UNLOCK_POLICY": {
      return patchMagicReveal(
        state,
        action.id,
        (m) => ({ ...m, unlockPolicy: action.unlockPolicy }),
        STUDIO_MAGIC_EVENTS.unlockPolicyChanged,
        {}
      );
    }

    case "RUN_MAGIC_SAFETY_SCAN": {
      const s0 = pushHistory(state);
      const pid = s0.project.id;
      let events = appendStudioEvent(s0.events, pid, STUDIO_MAGIC_EVENTS.safetyScanStarted, {});
      const now = new Date().toISOString();
      const magicReveals = s0.project.magicReveals.map((m) => (m.status === "deleted" ? m : applyMagicSafetyScanToReveal(m, now)));
      const project = { ...s0.project, magicReveals, updatedAt: now };
      events = appendStudioEvent(events, pid, STUDIO_MAGIC_EVENTS.safetyScanCompleted, { count: magicReveals.length });
      return { ...s0, project, events };
    }

    case "SET_PREVIEW_UNLOCK_SHEET": {
      const project = {
        ...state.project,
        previewUnlockSheetOpen: action.open,
        unlockPreviewScenario: action.scenario ?? state.project.unlockPreviewScenario,
        updatedAt: new Date().toISOString(),
      };
      const ev = action.open ? STUDIO_MAGIC_EVENTS.unlockPreviewOpened : STUDIO_MAGIC_EVENTS.unlockPreviewClosed;
      return withEvent({ ...state, project }, ev, {});
    }

    case "OPEN_PREVIEW_UNLOCK_SHEET": {
      const project = {
        ...state.project,
        previewUnlockSheetOpen: true,
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...state, project }, STUDIO_MAGIC_EVENTS.unlockPreviewOpened, {});
    }

    case "CLOSE_PREVIEW_UNLOCK_SHEET": {
      const project = {
        ...state.project,
        previewUnlockSheetOpen: false,
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...state, project }, STUDIO_MAGIC_EVENTS.unlockPreviewClosed, {});
    }

    case "UPDATE_MONETIZATION": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        monetization: { ...s0.project.monetization, ...action.patch },
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, "studio.monetization.updated", action.patch);
    }

    case "RUN_RIGHTS_SCAN": {
      let events = appendStudioEvent(state.events, pid, STUDIO_RIGHTS_PUBLISH_EVENTS.scanStarted, {});
      const rightsReport = runRightsScan(state.project);
      const disclosures = rebuildPublishDisclosures({ ...state.project, rightsReport });
      const project = {
        ...state.project,
        rightsReport,
        disclosures,
        updatedAt: new Date().toISOString(),
      };
      events = appendStudioEvent(events, pid, STUDIO_RIGHTS_PUBLISH_EVENTS.scanCompleted, {
        status: rightsReport.status,
      });
      for (const w of rightsReport.warnings) {
        events = appendStudioEvent(events, pid, STUDIO_RIGHTS_PUBLISH_EVENTS.warningCreated, { message: w });
      }
      if (!rightsReport.monetizationAllowed) {
        events = appendStudioEvent(events, pid, STUDIO_RIGHTS_PUBLISH_EVENTS.monetizationBlocked, {});
      }
      return { ...state, project, events };
    }

    case "RUN_SAFETY_SCAN": {
      let events = appendStudioEvent(state.events, pid, STUDIO_SAFETY_PUBLISH_EVENTS.scanStarted, {});
      const safetyReport = runSafetyScan(state.project);
      const project = {
        ...state.project,
        safetyReport,
        ageRating: safetyReport.ageRating,
        updatedAt: new Date().toISOString(),
      };
      events = appendStudioEvent(events, pid, STUDIO_SAFETY_PUBLISH_EVENTS.scanCompleted, {
        status: safetyReport.status,
      });
      for (const issue of safetyReport.detectedIssues) {
        events = appendStudioEvent(events, pid, STUDIO_SAFETY_PUBLISH_EVENTS.issueDetected, {
          issueId: issue.id,
          type: issue.type,
        });
      }
      if (safetyReport.status === "blocked") {
        events = appendStudioEvent(events, pid, STUDIO_SAFETY_PUBLISH_EVENTS.publishBlocked, {
          reasons: safetyReport.blockedReasons,
        });
      }
      if (safetyReport.detectedIssues.some((i) => i.severity === "warning")) {
        events = appendStudioEvent(events, pid, STUDIO_SAFETY_PUBLISH_EVENTS.warningCreated, {});
      }
      return { ...state, project, events };
    }

    case "SET_PUBLISH_TARGET": {
      const project = {
        ...state.project,
        publishTarget: action.publishTarget,
        disclosures: rebuildPublishDisclosures({ ...state.project, publishTarget: action.publishTarget }),
        updatedAt: new Date().toISOString(),
      };
      let events = appendStudioEvent(state.events, pid, STUDIO_PUBLISH_EVENTS.targetChanged, {
        publishTarget: action.publishTarget,
      });
      return { ...state, project, events };
    }

    case "SET_POST_VISIBILITY": {
      const project = {
        ...state.project,
        visibility: action.visibility,
        updatedAt: new Date().toISOString(),
      };
      let events = appendStudioEvent(state.events, pid, STUDIO_PUBLISH_EVENTS.visibilityChanged, {
        visibility: action.visibility,
      });
      return { ...state, project, events };
    }

    case "SET_POST_CAPTION": {
      const project = {
        ...state.project,
        caption: action.caption,
        updatedAt: new Date().toISOString(),
      };
      let events = appendStudioEvent(state.events, pid, STUDIO_PUBLISH_EVENTS.captionChanged, {});
      return { ...state, project, events };
    }

    case "SET_POST_HASHTAGS": {
      const project = {
        ...state.project,
        hashtags: action.hashtags,
        updatedAt: new Date().toISOString(),
      };
      let events = appendStudioEvent(state.events, pid, STUDIO_PUBLISH_EVENTS.hashtagsChanged, {});
      return { ...state, project, events };
    }

    case "SET_MONETIZATION_MODE": {
      const project = {
        ...state.project,
        monetizationMode: action.monetizationMode,
        disclosures: rebuildPublishDisclosures({ ...state.project, monetizationMode: action.monetizationMode }),
        updatedAt: new Date().toISOString(),
      };
      let events = appendStudioEvent(state.events, pid, STUDIO_PUBLISH_EVENTS.monetizationModeChanged, {
        monetizationMode: action.monetizationMode,
      });
      return { ...state, project, events };
    }

    case "RUN_PUBLISH_VALIDATION": {
      let events = appendStudioEvent(state.events, pid, STUDIO_PUBLISH_EVENTS.validationStarted, {});
      const disclosures = rebuildPublishDisclosures(state.project);
      const projectBase = { ...state.project, disclosures };
      const validation = runPublishValidation(projectBase, defaultPublishWalletState());
      const hasBlocking = validation.checks.some((c) => c.blocking && (c.status === "failed" || c.status === "blocked"));
      const publishStatus: PublishStatus = validation.canPublish
        ? "ready"
        : hasBlocking
          ? "blocked"
          : "failed";
      const project = {
        ...projectBase,
        publishChecks: validation.checks,
        publishStatus,
        updatedAt: new Date().toISOString(),
      };
      events = appendStudioEvent(events, pid, STUDIO_PUBLISH_EVENTS.validationCompleted, {
        canPublish: validation.canPublish,
        canExport: validation.canExport,
      });
      for (const c of validation.checks) {
        if (c.status === "passed") {
          events = appendStudioEvent(events, pid, STUDIO_PUBLISH_EVENTS.checkPassed, { checkId: c.id });
        } else if (c.status === "warning") {
          events = appendStudioEvent(events, pid, STUDIO_PUBLISH_EVENTS.checkFailed, { checkId: c.id, level: "warning" });
        } else if (c.blocking) {
          events = appendStudioEvent(events, pid, STUDIO_PUBLISH_EVENTS.checkBlocked, { checkId: c.id });
        } else {
          events = appendStudioEvent(events, pid, STUDIO_PUBLISH_EVENTS.checkFailed, { checkId: c.id });
        }
      }
      return { ...state, project, events };
    }

    case "BUILD_POST_PACKAGE": {
      if (!state.project.exportManifest) {
        const events = appendStudioEvent(state.events, pid, STUDIO_PUBLISH_EVENTS.failed, {
          reason: "missing_export_manifest",
        });
        return { ...state, events };
      }
      const disclosures = rebuildPublishDisclosures(state.project);
      const base = { ...state.project, disclosures };
      const exportManifest = base.exportManifest!;
      const safetyReport = base.safetyReport ?? runSafetyScan(base);
      const rightsReport = base.rightsReport ?? runRightsScan(base);
      const postPackage = buildPostPackage({
        project: { ...base, safetyReport, rightsReport },
        safetyReport,
        rightsReport,
        exportManifest,
      });
      let events = appendStudioEvent(state.events, pid, STUDIO_POST_PACKAGE_EVENTS.postPackageCreated, {
        packageId: postPackage.id,
      });
      const project = {
        ...base,
        safetyReport,
        rightsReport,
        postPackage,
        publishStatus: "ready" as const,
        updatedAt: new Date().toISOString(),
      };
      return { ...state, project, events };
    }

    case "OPEN_PUBLISH_PANEL": {
      const events = appendStudioEvent(state.events, pid, STUDIO_PUBLISH_EVENTS.panelOpened, {});
      const project = {
        ...state.project,
        activeTool: "publish" as const,
        updatedAt: new Date().toISOString(),
      };
      return { ...state, publishPanelOpen: true, inspectorOpen: true, project, events };
    }

    case "CLOSE_PUBLISH_PANEL": {
      const events = appendStudioEvent(state.events, pid, STUDIO_PUBLISH_EVENTS.panelClosed, {});
      return { ...state, publishPanelOpen: false, events };
    }

    case "OPEN_RUNTIME_PREVIEW": {
      if (!state.project.postPackage) {
        return state;
      }
      let events = appendStudioEvent(state.events, pid, STUDIO_POST_PACKAGE_EVENTS.runtimePreviewOpened, {});
      return {
        ...state,
        runtimePreviewOpen: true,
        runtimePreviewPackage: state.project.postPackage,
        events,
      };
    }

    case "CLOSE_RUNTIME_PREVIEW": {
      let events = appendStudioEvent(state.events, pid, STUDIO_POST_PACKAGE_EVENTS.runtimePreviewClosed, {});
      return { ...state, runtimePreviewOpen: false, events };
    }

    case "OPEN_SAFETY_REPORT_PANEL": {
      return { ...state, safetyReportPanelOpen: true };
    }

    case "CLOSE_SAFETY_REPORT_PANEL": {
      return { ...state, safetyReportPanelOpen: false };
    }

    case "OPEN_RIGHTS_REPORT_PANEL": {
      return { ...state, rightsReportPanelOpen: true };
    }

    case "CLOSE_RIGHTS_REPORT_PANEL": {
      return { ...state, rightsReportPanelOpen: false };
    }

    case "UPDATE_DISCLOSURE": {
      const project = {
        ...state.project,
        disclosures: state.project.disclosures.map((d) => {
          if (d.id !== action.id) return d;
          const patch = { ...action.patch };
          if (d.required && patch.required === false) {
            delete patch.required;
          }
          return { ...d, ...patch };
        }),
        updatedAt: new Date().toISOString(),
      };
      return { ...state, project };
    }

    case "ACCEPT_DISCLOSURE_REQUIREMENT": {
      const project = {
        ...state.project,
        disclosures: state.project.disclosures.map((d) =>
          d.id === action.id ? { ...d, requirementAccepted: true } : d
        ),
        updatedAt: new Date().toISOString(),
      };
      return { ...state, project };
    }

    case "ADD_CAF": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        cafSegments: [...s0.project.cafSegments, action.segment],
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, "studio.caf.created", { id: action.segment.id });
    }

    case "UPDATE_CAF": {
      const s0 = pushHistory(state);
      const project = {
        ...s0.project,
        cafSegments: s0.project.cafSegments.map((c) => (c.id === action.id ? { ...c, ...action.patch } : c)),
        updatedAt: new Date().toISOString(),
      };
      return withEvent({ ...s0, project }, "studio.caf.updated", { id: action.id });
    }

    case "PUBLISH_PROJECT": {
      let events = appendStudioEvent(state.events, pid, STUDIO_PUBLISH_EVENTS.started, {});
      const wallet = defaultPublishWalletState();
      const result = publishProjectLocal(state.project, wallet);
      if (!result.ok) {
        events = appendStudioEvent(events, pid, STUDIO_PUBLISH_EVENTS.blocked, {
          reasons: result.blockedReasons,
        });
        events = appendStudioEvent(events, pid, STUDIO_PUBLISH_EVENTS.validationCompleted, {
          canPublish: false,
        });
        const project = {
          ...state.project,
          publishChecks: result.validation.checks,
          publishStatus: "blocked" as const,
          updatedAt: new Date().toISOString(),
        };
        return { ...state, project, events };
      }
      events = appendStudioEvent(events, pid, STUDIO_POST_PACKAGE_EVENTS.postPackageCreated, {
        packageId: result.postPackage.id,
      });
      events = appendStudioEvent(events, pid, STUDIO_PUBLISH_EVENTS.completed, {
        publishedPostId: result.publishedPost.id,
      });
      const project: StudioProject = {
        ...state.project,
        postPackage: result.postPackage,
        publishedPost: result.publishedPost,
        status: "published",
        publishStatus: "published",
        activeTool: "publish",
        updatedAt: new Date().toISOString(),
      };
      return {
        ...state,
        project,
        events,
        publishPanelOpen: true,
        inspectorOpen: true,
      };
    }

    case "OPEN_UNLOCK_SIMULATOR": {
      return withEvent({ ...state, unlockSimulatorOpen: true }, STUDIO_UNLOCK_EVENTS.simulatorOpened, {});
    }

    case "CLOSE_UNLOCK_SIMULATOR": {
      return withEvent({ ...state, unlockSimulatorOpen: false }, STUDIO_UNLOCK_EVENTS.simulatorClosed, {});
    }

    case "SIMULATE_REVEAL_UNLOCK": {
      const previewPkg =
        state.runtimePreviewOpen && state.runtimePreviewPackage ? state.runtimePreviewPackage : null;
      const revealList = previewPkg?.magicReveals ?? state.project.magicReveals;
      const reveal = revealList.find((m) => m.id === action.revealId);
      if (!reveal) {
        return withEvent(state, STUDIO_UNLOCK_EVENTS.blocked, { reason: "reveal_not_found", revealId: action.revealId });
      }
      const viewer = accountByType(state.walletAccounts, "viewer");
      const creator = accountByType(state.walletAccounts, "creator");
      const platform = accountByType(state.walletAccounts, "platform");
      const escrow = accountByType(state.walletAccounts, "escrow");
      const pool = accountByType(state.walletAccounts, "reward_pool");
      if (!viewer || !creator || !platform || !escrow || !pool) {
        return withEvent(state, STUDIO_UNLOCK_EVENTS.failed, { reason: "missing_wallet_accounts" });
      }
      const now = new Date().toISOString();
      const postForSim =
        previewPkg != null
          ? {
              ...state.studioSimPost,
              postId: previewPkg.id,
            }
          : state.studioSimPost;
      const sim = simulateRevealUnlock({
        reveal,
        viewerAccount: viewer,
        creatorAccount: creator,
        platformAccount: platform,
        escrowAccount: escrow,
        rewardPoolAccount: pool,
        post: postForSim,
        amountOverride: action.amountOverride,
        now,
        existingUnlocks: state.unlocks,
        forPreview: Boolean(previewPkg),
      });
      let events = appendStudioEvent(state.events, state.project.id, STUDIO_UNLOCK_EVENTS.started, {
        revealId: action.revealId,
      });
      if (!sim.success) {
        events = appendStudioEvent(events, state.project.id, STUDIO_UNLOCK_EVENTS.blocked, {
          message: sim.resultMessage,
        });
        return { ...state, events };
      }
      events = appendStudioEvent(events, state.project.id, STUDIO_UNLOCK_EVENTS.completed, {
        unlockId: sim.unlock.id,
        revealId: action.revealId,
      });
      for (const e of sim.ledgerEntries) {
        events = appendStudioEvent(events, state.project.id, STUDIO_WALLET_EVENTS.ledgerEntryCreated, {
          entryId: e.id,
          entryType: e.type,
        });
      }
      let studioSimPost = state.studioSimPost;
      if (sim.updatedPostTips != null) {
        studioSimPost = { ...state.studioSimPost, totalTips: sim.updatedPostTips };
      }
      return {
        ...state,
        studioSimPost,
        walletAccounts: mergeWalletAccounts(state.walletAccounts, sim.updatedAccounts),
        ledgerEntries: [...state.ledgerEntries, ...sim.ledgerEntries],
        unlocks: [...state.unlocks, sim.unlock],
        selectedUnlockId: sim.unlock.id,
        events,
      };
    }

    case "CONFIRM_REVEAL_UNLOCK": {
      const previewPkg =
        state.runtimePreviewOpen && state.runtimePreviewPackage ? state.runtimePreviewPackage : null;
      const revealList = previewPkg?.magicReveals ?? state.project.magicReveals;
      const reveal = revealList.find((m) => m.id === action.revealId);
      if (!reveal) {
        return withEvent(state, STUDIO_UNLOCK_EVENTS.blocked, { reason: "reveal_not_found", revealId: action.revealId });
      }
      const viewer = accountByType(state.walletAccounts, "viewer");
      const creator = accountByType(state.walletAccounts, "creator");
      const platform = accountByType(state.walletAccounts, "platform");
      const escrow = accountByType(state.walletAccounts, "escrow");
      const pool = accountByType(state.walletAccounts, "reward_pool");
      if (!viewer || !creator || !platform || !escrow || !pool) {
        return withEvent(state, STUDIO_UNLOCK_EVENTS.failed, { reason: "missing_wallet_accounts" });
      }
      const now = new Date().toISOString();
      const postForSim =
        previewPkg != null
          ? {
              ...state.studioSimPost,
              postId: previewPkg.id,
            }
          : state.studioSimPost;

      const simSession = state.unlockVerificationSim;
      const durationMs = Math.max(1, state.project.durationMs || 30_000);
      const pipeline = runMagicUnlockVerificationPipeline({
        viewerAccount: viewer,
        creatorAccount: creator,
        reveal,
        post: postForSim,
        unlocks: state.unlocks,
        ledgerEntries: state.ledgerEntries,
        popsChallenges: state.popsChallenges,
        recentEvents: [] as RuntimePostActionEvent[],
        session: {
          watchMs: simSession.watchMs,
          durationMs,
          attentionScore: simSession.attentionScore,
          flagged: simSession.sessionFlagged,
          ageGatePassed: simSession.ageGatePassed,
          disclosureAcknowledged: simSession.disclosureAcknowledged,
          locationMatch: simSession.locationMatch,
          qrScanned: simSession.qrScanned,
        },
        now,
      });

      let events = appendStudioEvent(state.events, state.project.id, STUDIO_VERIFICATION_EVENTS.verificationStarted, {
        revealId: action.revealId,
      });
      events = appendStudioEvent(events, state.project.id, STUDIO_FRAUD_EVENTS.assessmentCreated, {
        assessmentId: pipeline.fraudAssessment.id,
        riskLevel: pipeline.fraudAssessment.riskLevel,
      });
      for (const s of pipeline.fraudAssessment.signals) {
        events = appendStudioEvent(events, state.project.id, STUDIO_FRAUD_EVENTS.signalDetected, {
          type: s.type,
          severity: s.severity,
        });
      }
      const riskEvt =
        pipeline.fraudAssessment.riskLevel === "low"
          ? STUDIO_FRAUD_EVENTS.riskLow
          : pipeline.fraudAssessment.riskLevel === "medium"
            ? STUDIO_FRAUD_EVENTS.riskMedium
            : pipeline.fraudAssessment.riskLevel === "high"
              ? STUDIO_FRAUD_EVENTS.riskHigh
              : STUDIO_FRAUD_EVENTS.riskCritical;
      events = appendStudioEvent(events, state.project.id, riskEvt, { score: pipeline.fraudAssessment.riskScore });

      const fraudAssessments = [...state.fraudAssessments, pipeline.fraudAssessment];
      let popsChallenges = state.popsChallenges;
      const rewardAmount = reveal.reward?.viewerRewardAmount ?? 0;
      const priceAmount = reveal.pricing?.amount ?? 0;
      const popsMethods = selectRequiredPOPS({
        rewardAmount: rewardAmount || priceAmount,
        riskScore: pipeline.fraudAssessment.riskScore,
        campaignFraudSensitivity: "medium",
        actionType: "unlock",
        viewerTrustScore: viewer.trustScore ?? 50,
        campaignRequiresGps: reveal.revealType === "location_to_reveal",
        campaignRequiresQr:
          Boolean(reveal.eligibility && "requireQr" in reveal.eligibility && (reveal.eligibility as { requireQr?: boolean }).requireQr),
      });
      const missing = missingPOPSMethods(popsMethods, popsChallenges, {
        revealId: reveal.id,
        viewerUserId: viewer.userId,
      });

      if (!pipeline.popsPassed && missing.length > 0) {
        const created = missing.map((m) => createPOPSChallenge(m, { revealId: reveal.id, viewerUserId: viewer.userId }));
        popsChallenges = [...popsChallenges, ...created];
        for (const c of created) {
          events = appendStudioEvent(events, state.project.id, STUDIO_POPS_EVENTS.challengeCreated, { challengeId: c.id });
        }
        events = appendStudioEvent(events, state.project.id, STUDIO_VERIFICATION_EVENTS.verificationUnderReview, {
          revealId: reveal.id,
        });
        events = appendStudioEvent(events, state.project.id, STUDIO_SETTLEMENT_VERIFICATION_EVENTS.releaseBlocked, {
          reason: "POPS required",
        });
        const verificationRecords = [...state.verificationRecords, pipeline.verificationRecord];
        return {
          ...state,
          events,
          fraudAssessments,
          popsChallenges,
          verificationRecords,
          selectedVerificationId: pipeline.verificationRecord.id,
          lastConfirmUnlockMessage:
            pipeline.blockReason ?? "Complete POPS challenges in the Verify tool, then confirm unlock again.",
        };
      }

      if (!pipeline.rewardAllowed) {
        events = appendStudioEvent(events, state.project.id, STUDIO_VERIFICATION_EVENTS.verificationFailed, {
          recordId: pipeline.verificationRecord.id,
        });
        events = appendStudioEvent(events, state.project.id, STUDIO_FRAUD_EVENTS.actionRejected, {});
        events = appendStudioEvent(events, state.project.id, STUDIO_SETTLEMENT_VERIFICATION_EVENTS.releaseBlocked, {
          reason: pipeline.blockReason,
        });
        return {
          ...state,
          events,
          fraudAssessments,
          verificationRecords: [...state.verificationRecords, pipeline.verificationRecord],
          selectedVerificationId: pipeline.verificationRecord.id,
          lastConfirmUnlockMessage: pipeline.blockReason ?? "Unlock blocked by verification / fraud simulation.",
        };
      }

      events = appendStudioEvent(events, state.project.id, STUDIO_UNLOCK_EVENTS.confirmed, {
        revealId: action.revealId,
      });
      events = appendStudioEvent(events, state.project.id, STUDIO_VERIFICATION_EVENTS.verificationCompleted, {
        recordId: pipeline.verificationRecord.id,
      });
      events = appendStudioEvent(events, state.project.id, STUDIO_FRAUD_EVENTS.actionAllowed, {});
      events = appendStudioEvent(events, state.project.id, STUDIO_SETTLEMENT_VERIFICATION_EVENTS.decisionCreated, {
        status: pipeline.verificationRecord.settlementDecision.status,
      });

      const sim = simulateRevealUnlock({
        reveal,
        viewerAccount: viewer,
        creatorAccount: creator,
        platformAccount: platform,
        escrowAccount: escrow,
        rewardPoolAccount: pool,
        post: postForSim,
        amountOverride: action.amountOverride,
        now,
        existingUnlocks: state.unlocks,
        forPreview: Boolean(previewPkg),
      });
      events = appendStudioEvent(events, state.project.id, STUDIO_UNLOCK_EVENTS.started, {
        revealId: action.revealId,
      });
      if (!sim.success) {
        events = appendStudioEvent(events, state.project.id, STUDIO_UNLOCK_EVENTS.blocked, {
          message: sim.resultMessage,
        });
        return {
          ...state,
          events,
          fraudAssessments,
          verificationRecords: [...state.verificationRecords, pipeline.verificationRecord],
          lastConfirmUnlockMessage: sim.resultMessage,
        };
      }
      events = appendStudioEvent(events, state.project.id, STUDIO_UNLOCK_EVENTS.completed, {
        unlockId: sim.unlock.id,
        revealId: action.revealId,
      });
      for (const e of sim.ledgerEntries) {
        events = appendStudioEvent(events, state.project.id, STUDIO_WALLET_EVENTS.ledgerEntryCreated, {
          entryId: e.id,
          entryType: e.type,
        });
      }
      let studioSimPost = state.studioSimPost;
      if (sim.updatedPostTips != null) {
        studioSimPost = { ...state.studioSimPost, totalTips: sim.updatedPostTips };
      }
      return {
        ...state,
        studioSimPost,
        walletAccounts: mergeWalletAccounts(state.walletAccounts, sim.updatedAccounts),
        ledgerEntries: [...state.ledgerEntries, ...sim.ledgerEntries],
        unlocks: [...state.unlocks, sim.unlock],
        selectedUnlockId: sim.unlock.id,
        events,
        fraudAssessments,
        popsChallenges,
        verificationRecords: [...state.verificationRecords, pipeline.verificationRecord],
        selectedVerificationId: pipeline.verificationRecord.id,
        lastConfirmUnlockMessage: "Unlock verified — rewards follow wallet / settlement rules.",
      };
    }

    case "MOCK_VERIFY_UNLOCK": {
      const unlock = state.unlocks.find((u) => u.id === action.unlockId);
      if (!unlock) return state;
      const { unlock: u, accounts, newEntries } = mockVerifyUnlock({
        unlock,
        accounts: state.walletAccounts,
        now: new Date().toISOString(),
      });
      let events = appendStudioEvent(state.events, state.project.id, STUDIO_UNLOCK_EVENTS.verificationCompleted, {
        unlockId: action.unlockId,
      });
      for (const e of newEntries) {
        events = appendStudioEvent(events, state.project.id, STUDIO_WALLET_EVENTS.viewerRewardCredited, { entryId: e.id });
      }
      return {
        ...state,
        walletAccounts: accounts,
        ledgerEntries: newEntries.length ? [...state.ledgerEntries, ...newEntries] : state.ledgerEntries,
        unlocks: state.unlocks.map((x) => (x.id === u.id ? u : x)),
        events,
      };
    }

    case "MOCK_RELEASE_SETTLEMENT": {
      const unlock = state.unlocks.find((x) => x.id === action.unlockId);
      if (!unlock) return state;
      const reveal = state.project.magicReveals.find((r) => r.id === unlock.revealId);
      const gate = canReleaseCreatorSettlement({
        verificationRecords: state.verificationRecords,
        fraudAssessments: state.fraudAssessments,
        disputes: state.disputes,
        unlock,
        reveal,
      });
      if (!gate.ok) {
        let events = appendStudioEvent(state.events, state.project.id, STUDIO_SETTLEMENT_VERIFICATION_EVENTS.releaseBlocked, {
          unlockId: action.unlockId,
          reason: gate.reason,
        });
        return { ...state, events, lastConfirmUnlockMessage: gate.reason };
      }
      const creator = accountByType(state.walletAccounts, "creator");
      if (!creator) return state;
      const { unlock: u, accounts, newEntries } = mockReleaseSettlement({
        unlock,
        accounts: state.walletAccounts,
        creatorAccountId: creator.id,
        coin: unlock.coin,
        now: new Date().toISOString(),
      });
      let events = appendStudioEvent(state.events, state.project.id, STUDIO_SETTLEMENT_VERIFICATION_EVENTS.releaseAllowed, {
        unlockId: action.unlockId,
      });
      events = appendStudioEvent(events, state.project.id, STUDIO_UNLOCK_EVENTS.settlementReleased, {
        unlockId: action.unlockId,
      });
      for (const e of newEntries) {
        events = appendStudioEvent(events, state.project.id, STUDIO_WALLET_EVENTS.balanceChanged, { entryId: e.id });
      }
      return {
        ...state,
        walletAccounts: accounts,
        ledgerEntries: newEntries.length ? [...state.ledgerEntries, ...newEntries] : state.ledgerEntries,
        unlocks: state.unlocks.map((x) => (x.id === u.id ? u : x)),
        events,
      };
    }

    case "MOCK_REFUND_UNLOCK": {
      const unlock = state.unlocks.find((x) => x.id === action.unlockId);
      if (!unlock) return state;
      const viewer = accountByType(state.walletAccounts, "viewer");
      const creator = accountByType(state.walletAccounts, "creator");
      const platform = accountByType(state.walletAccounts, "platform");
      if (!viewer || !creator || !platform) return state;
      const { unlock: u, accounts, newEntries } = mockRefundUnlock({
        unlock,
        accounts: state.walletAccounts,
        viewerAccountId: viewer.id,
        creatorAccountId: creator.id,
        platformAccountId: platform.id,
        coin: unlock.coin,
        now: new Date().toISOString(),
      });
      let events = appendStudioEvent(state.events, state.project.id, STUDIO_UNLOCK_EVENTS.refunded, {
        unlockId: action.unlockId,
      });
      return {
        ...state,
        walletAccounts: accounts,
        ledgerEntries: newEntries.length ? [...state.ledgerEntries, ...newEntries] : state.ledgerEntries,
        unlocks: state.unlocks.map((x) => (x.id === u.id ? u : x)),
        events,
      };
    }

    case "SELECT_UNLOCK": {
      return withEvent({ ...state, selectedUnlockId: action.id }, STUDIO_UNLOCK_EVENTS.unlockSelected, {
        unlockId: action.id,
      });
    }

    case "OPEN_WALLET_PANEL": {
      return withEvent({ ...state, walletPanelOpen: true }, "studio.wallet.panel_opened", {});
    }

    case "CLOSE_WALLET_PANEL": {
      return withEvent({ ...state, walletPanelOpen: false }, "studio.wallet.panel_closed", {});
    }

    case "SET_SETTLEMENT_SUMMARY_OPEN": {
      return withEvent({ ...state, settlementSummaryOpen: action.open }, "studio.wallet.settlement_summary_toggled", {
        open: action.open,
      });
    }

    case "ADD_LEDGER_ENTRIES": {
      let events = state.events;
      for (const e of action.entries) {
        events = appendStudioEvent(events, state.project.id, STUDIO_WALLET_EVENTS.ledgerEntryCreated, {
          entryId: e.id,
          entryType: e.type,
        });
      }
      return { ...state, ledgerEntries: [...state.ledgerEntries, ...action.entries], events };
    }

    case "UPDATE_WALLET_ACCOUNTS": {
      return withEvent({ ...state, walletAccounts: action.accounts }, STUDIO_WALLET_EVENTS.balanceChanged, {
        source: "manual_update",
      });
    }

    case "SET_BACKEND_SYNC_STATUS": {
      return { ...state, backendSyncStatus: action.status };
    }

    case "LOG_BACKEND_EVENT": {
      const row = {
        type: action.eventType,
        createdAt: new Date().toISOString(),
        payload: action.payload,
      };
      const backendEvents = [...state.backendEvents, row].slice(-200);
      return { ...state, backendEvents };
    }

    case "SET_PERSISTED_SNAPSHOT_META": {
      return { ...state, persistedSnapshotMeta: action.meta };
    }

    case "SET_SELECTED_BACKEND_PANEL": {
      return { ...state, selectedBackendPanel: action.tab };
    }

    case "SET_BACKEND_MODE": {
      resetSupabaseClientCache();
      return {
        ...state,
        ...applyBackendPersistenceState({ mode: action.mode }),
      };
    }

    case "SET_BACKEND_CONFIG": {
      resetSupabaseClientCache();
      return {
        ...state,
        ...applyBackendPersistenceState(action.patch),
      };
    }

    case "CHECK_BACKEND_HEALTH": {
      return { ...state, backendHealth: checkBackendHealth(state.backendConfig) };
    }

    case "INITIALIZE_PERSISTENCE_ADAPTER": {
      resetSupabaseClientCache();
      return {
        ...state,
        ...applyBackendPersistenceState({
          mode: state.backendConfig.mode,
          strictBackendMode: state.backendConfig.strictBackendMode,
          enablePersistence: state.backendConfig.enablePersistence,
          enableRealtime: state.backendConfig.enableRealtime,
          enableEdgeFunctions: state.backendConfig.enableEdgeFunctions,
          enableServerValidation: state.backendConfig.enableServerValidation,
          enableServerLedger: state.backendConfig.enableServerLedger,
          enableServerVerification: state.backendConfig.enableServerVerification,
        }),
      };
    }

    case "HYDRATE_PROJECT": {
      const project = { ...action.project, updatedAt: new Date().toISOString() };
      return withEvent(
        { ...state, project, history: [], future: [] },
        STUDIO_BACKEND_EVENTS.projectPersisted,
        { projectId: project.id, source: "hydrate" }
      );
    }

    case "OPEN_VERIFICATION_PANEL": {
      let next = { ...state, verificationPanelOpen: true, inspectorOpen: true };
      if (next.verificationRecords.length === 0 && next.disputes.length === 0 && next.popsChallenges.length === 0) {
        next = {
          ...next,
          verificationRecords: [...mockVerificationRecords],
          popsChallenges: [...mockPOPSChallenges],
          disputes: [...mockDisputes],
        };
      }
      return withEvent(next, STUDIO_VERIFICATION_EVENTS.verificationStarted, { source: "panel_open" });
    }

    case "CLOSE_VERIFICATION_PANEL": {
      return { ...state, verificationPanelOpen: false };
    }

    case "OPEN_RISK_MONITOR": {
      return withEvent({ ...state, riskMonitorOpen: true, inspectorOpen: true }, "risk.monitor_opened", {
        source: "risk_monitor_open",
      });
    }

    case "CLOSE_RISK_MONITOR": {
      return { ...state, riskMonitorOpen: false };
    }

    case "SELECT_VERIFICATION_RECORD": {
      return { ...state, selectedVerificationId: action.id };
    }

    case "SELECT_DISPUTE": {
      return { ...state, selectedDisputeId: action.id };
    }

    case "SET_UNLOCK_VERIFICATION_SIM": {
      return {
        ...state,
        unlockVerificationSim: { ...state.unlockVerificationSim, ...action.patch },
      };
    }

    case "CREATE_POPS_CHALLENGE": {
      const ch = createPOPSChallenge(action.method, {
        revealId: action.revealId,
        campaignId: action.campaignId,
        viewerUserId: accountByType(state.walletAccounts, "viewer")?.userId,
      });
      let events = appendStudioEvent(state.events, state.project.id, STUDIO_POPS_EVENTS.challengeCreated, {
        challengeId: ch.id,
      });
      return { ...state, popsChallenges: [...state.popsChallenges, ch], events };
    }

    case "COMPLETE_POPS_CHALLENGE": {
      const ch0 = state.popsChallenges.find((c) => c.id === action.challengeId);
      if (!ch0) return state;
      const { challenge, gate } = evaluatePOPSChallenge(ch0, {
        completedInMs: action.passed ? 1200 : 50,
        userActionQuality: action.passed ? 0.92 : 0.2,
        locationMatch: state.unlockVerificationSim.locationMatch,
        sessionContinuity: !state.unlockVerificationSim.sessionFlagged,
        cameraMockOk: true,
        audioMockOk: true,
      });
      let events = appendStudioEvent(
        state.events,
        state.project.id,
        action.passed ? STUDIO_POPS_EVENTS.challengePassed : STUDIO_POPS_EVENTS.challengeFailed,
        { challengeId: challenge.id }
      );
      events = appendStudioEvent(events, state.project.id, STUDIO_VERIFICATION_EVENTS.verificationGatePassed, {
        gateType: gate.gateType,
        status: gate.status,
      });
      return {
        ...state,
        popsChallenges: state.popsChallenges.map((c) => (c.id === challenge.id ? challenge : c)),
        events,
      };
    }

    case "EXPIRE_POPS_CHALLENGE": {
      const now = new Date().toISOString();
      const ch0 = state.popsChallenges.find((c) => c.id === action.challengeId);
      if (!ch0) return state;
      const challenge = { ...ch0, status: "expired" as const, completedAt: now };
      let events = appendStudioEvent(state.events, state.project.id, STUDIO_POPS_EVENTS.challengeExpired, {
        challengeId: challenge.id,
      });
      return {
        ...state,
        popsChallenges: state.popsChallenges.map((c) => (c.id === challenge.id ? challenge : c)),
        events,
      };
    }

    case "CREATE_DISPUTE": {
      const now = new Date().toISOString();
      const d = createDispute({ ...action.input, nowIso: now });
      let events = appendStudioEvent(state.events, state.project.id, STUDIO_DISPUTE_EVENTS.created, { disputeId: d.id });
      return { ...state, disputes: [...state.disputes, d], selectedDisputeId: d.id, events };
    }

    case "COLLECT_DISPUTE_EVIDENCE": {
      const d0 = state.disputes.find((d) => d.id === action.disputeId);
      if (!d0) return state;
      const reveal = state.project.magicReveals.find((r) => r.id === d0.revealId);
      const next = collectDisputeEvidence(d0, {
        unlocks: state.unlocks,
        ledgerEntries: state.ledgerEntries,
        verificationRecords: state.verificationRecords,
        events: state.events,
        reveal,
      });
      let events = appendStudioEvent(state.events, state.project.id, STUDIO_DISPUTE_EVENTS.evidenceCollected, {
        disputeId: action.disputeId,
      });
      return {
        ...state,
        disputes: state.disputes.map((d) => (d.id === next.id ? next : d)),
        events,
      };
    }

    case "RESOLVE_DISPUTE": {
      const d0 = state.disputes.find((d) => d.id === action.disputeId);
      if (!d0) return state;
      const now = new Date().toISOString();
      const { dispute, trustImpacts } = resolveDispute(d0, action.resolution, now);
      let events = appendStudioEvent(state.events, state.project.id, STUDIO_DISPUTE_EVENTS.underReview, {});
      if (action.resolution === "viewer_wins") {
        events = appendStudioEvent(events, state.project.id, STUDIO_DISPUTE_EVENTS.resolvedViewerWins, {});
      } else if (action.resolution === "creator_wins") {
        events = appendStudioEvent(events, state.project.id, STUDIO_DISPUTE_EVENTS.resolvedCreatorWins, {});
      } else if (action.resolution === "rejected") {
        events = appendStudioEvent(events, state.project.id, STUDIO_DISPUTE_EVENTS.rejected, {});
      } else {
        events = appendStudioEvent(events, state.project.id, STUDIO_DISPUTE_EVENTS.escalated, {});
      }
      const dNext: Dispute = { ...dispute, trustImpacts: [...(dispute.trustImpacts ?? []), ...trustImpacts] };
      let walletAccounts = state.walletAccounts;
      for (const acc of walletAccounts) {
        const rel = trustImpacts.filter((t) => t.accountId === acc.userId || t.accountId === acc.id);
        if (rel.length) walletAccounts = walletAccounts.map((a) => (a.id === acc.id ? applyTrustImpact(a, rel) : a));
      }
      events = appendStudioEvent(events, state.project.id, STUDIO_TRUST_EVENTS.impactCreated, {});
      return {
        ...state,
        disputes: state.disputes.map((d) => (d.id === dNext.id ? dNext : d)),
        walletAccounts,
        events,
      };
    }

    case "APPLY_TRUST_IMPACT_MOCK": {
      const vr = action.verificationId
        ? state.verificationRecords.find((r) => r.id === action.verificationId)
        : state.verificationRecords[state.verificationRecords.length - 1];
      const fa = action.fraudAssessmentId
        ? state.fraudAssessments.find((f) => f.id === action.fraudAssessmentId)
        : state.fraudAssessments[state.fraudAssessments.length - 1];
      const now = new Date().toISOString();
      const vImp = calculateTrustImpact({ verificationRecord: vr, fraudAssessment: fa, role: "viewer" }, now);
      const cImp = calculateTrustImpact({ verificationRecord: vr, fraudAssessment: fa, role: "creator" }, now);
      const all = [...vImp, ...cImp];
      let walletAccounts = state.walletAccounts;
      for (const acc of walletAccounts) {
        const rel = all.filter((t) => t.accountId === acc.userId || t.accountId === acc.id);
        if (rel.length) walletAccounts = walletAccounts.map((a) => (a.id === acc.id ? applyTrustImpact(a, rel) : a));
      }
      let events = appendStudioEvent(state.events, state.project.id, STUDIO_TRUST_EVENTS.impactApplied, {});
      return { ...state, walletAccounts, events };
    }

    case "COMPLETE_CAMPAIGN_ACTION_MOCK": {
      const viewer = accountByType(state.walletAccounts, "viewer");
      const creator = accountByType(state.walletAccounts, "creator");
      if (!viewer || !creator) return state;
      const now = new Date().toISOString();
      const postId = state.studioSimPost.postId;
      const subjectId = `${postId}_${viewer.userId}`;
      const m = state.project.monetization;
      const campaign = {
        id: `cmp_${postId}`,
        budgetRemainingMinor: 2_000_000,
        rewardMinor: 50,
        requiresGps: Boolean(m.brandPaysPerVerifiedAction),
        requiresQr: false,
        fraudSensitivity: "medium" as const,
        frequencyCapPerDay: 10,
      };
      const fa = assessFraudRisk({
        viewerAccount: viewer,
        creatorAccount: creator,
        subjectType: "campaign_action",
        subjectId,
        post: { id: postId, metrics: { verifiedViews: state.studioSimPost.verifiedViews } },
        session: {
          watchMs: state.unlockVerificationSim.watchMs,
          durationMs: state.project.durationMs || 30_000,
          attentionScore: state.unlockVerificationSim.attentionScore,
        },
        recentEvents: [] as RuntimePostActionEvent[],
        recentUnlocks: state.unlocks,
        ledgerEntries: state.ledgerEntries,
        claimKeysUsed: state.studioCampaignClaimKeys,
      });
      const popsMethods = selectRequiredPOPS({
        rewardAmount: (campaign.rewardMinor ?? 0) / 100,
        riskScore: fa.riskScore,
        campaignFraudSensitivity: campaign.fraudSensitivity,
        actionType: "campaign",
        viewerTrustScore: viewer.trustScore ?? 50,
        campaignRequiresGps: campaign.requiresGps,
        campaignRequiresQr: campaign.requiresQr,
      });
      const popsPassed =
        popsMethods.length === 0 ||
        popsSatisfiedForCampaign(popsMethods, state.popsChallenges, campaign.id, viewer.userId);
      const vr = verifyRuntimeAction({
        subjectType: "campaign_action",
        subjectId,
        viewerAccount: viewer,
        creatorAccount: creator,
        post: { id: postId, metrics: { verifiedViews: state.studioSimPost.verifiedViews } },
        campaign,
        ledgerEntries: state.ledgerEntries,
        fraudAssessment: fa,
        popsPassed,
        session: {
          watchMs: state.unlockVerificationSim.watchMs,
          durationMs: state.project.durationMs || 30_000,
          attentionScore: state.unlockVerificationSim.attentionScore,
          ageGatePassed: state.unlockVerificationSim.ageGatePassed,
          disclosureAcknowledged: state.unlockVerificationSim.disclosureAcknowledged,
          locationMatch: state.unlockVerificationSim.locationMatch,
          qrScanned: state.unlockVerificationSim.qrScanned,
        },
        now,
      });
      let events = appendStudioEvent(state.events, state.project.id, STUDIO_VERIFICATION_EVENTS.verificationStarted, {
        subjectId,
      });
      events = appendStudioEvent(events, state.project.id, STUDIO_FRAUD_EVENTS.assessmentCreated, { assessmentId: fa.id });
      let studioCampaignClaimKeys = state.studioCampaignClaimKeys;
      if (vr.status === "passed" && fa.recommendedAction !== "reject" && fa.recommendedAction !== "reverse") {
        studioCampaignClaimKeys = [...studioCampaignClaimKeys, subjectId];
        events = appendStudioEvent(events, state.project.id, STUDIO_FRAUD_EVENTS.actionAllowed, {});
      } else {
        events = appendStudioEvent(events, state.project.id, STUDIO_FRAUD_EVENTS.actionRejected, { recordId: vr.id });
      }
      events = appendStudioEvent(events, state.project.id, STUDIO_VERIFICATION_EVENTS.verificationCompleted, {
        recordId: vr.id,
        status: vr.status,
      });
      return {
        ...state,
        fraudAssessments: [...state.fraudAssessments, fa],
        verificationRecords: [...state.verificationRecords, vr],
        studioCampaignClaimKeys,
        selectedVerificationId: vr.id,
        events,
      };
    }

    case "OPEN_BACKEND_PANEL": {
      const project = {
        ...state.project,
        activeTool: "backend" as StudioTool,
        updatedAt: new Date().toISOString(),
      };
      return withEvent(
        { ...state, project, inspectorOpen: true, backendReadinessOpen: true },
        STUDIO_EVENTS.toolSelected,
        { tool: "backend" }
      );
    }

    case "CLOSE_BACKEND_PANEL": {
      const project = {
        ...state.project,
        activeTool: "trim" as StudioTool,
        updatedAt: new Date().toISOString(),
      };
      return { ...state, project, backendReadinessOpen: false };
    }

    default:
      return state;
  }
}

export type StudioActions = {
  setMode: (mode: StudioMode) => void;
  setActiveTool: (tool: StudioTool) => void;
  setAspectRatio: (aspectRatio: AspectRatio) => void;
  setPlayhead: (playheadMs: number) => void;
  togglePlayback: () => void;
  setPlaying: (isPlaying: boolean) => void;
  selectClip: (clipId?: string) => void;
  selectTrack: (trackId?: string) => void;
  addAsset: (asset: StudioAsset) => void;
  mockUploadAsset: (asset: StudioAsset) => void;
  addTrack: (track: StudioTrack) => void;
  addClip: (clip: StudioClip) => void;
  updateClip: (clipId: string, patch: Partial<StudioClip>) => void;
  trimClip: (clipId: string, timelineStartMs: number, timelineEndMs: number) => void;
  splitClip: (clipId: string, atMs: number) => void;
  deleteClip: (clipId: string) => void;
  addOverlay: (overlay: StudioTextOverlay) => void;
  updateOverlay: (overlayId: string, patch: Partial<StudioTextOverlay>) => void;
  toggleTrackVisibility: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  toggleTrackMute: (trackId: string) => void;
  setExportSettings: (patch: Partial<StudioExportSettings>) => void;
  startExport: () => void;
  updateExportProgress: (progress: number) => void;
  completeExport: () => void;
  saveProject: () => void;
  setZoom: (zoom: number) => void;
  setInspectorOpen: (open: boolean) => void;
  setUploadState: (uploadState: StudioUploadState) => void;
  undo: () => void;
  redo: () => void;
  logEvent: (eventType: string, payload?: Record<string, unknown>) => void;
  createMockUploadedAsset: (name: string, type: StudioAssetType) => StudioAsset;
  setMagicTab: (tab: MagicPanelTab) => void;
  setMagicTarget: (target: string | null) => void;
  createMagicReveal: (reveal: MagicReveal) => void;
  updateMagicReveal: (id: string, patch: Partial<MagicReveal>) => void;
  deleteMagicReveal: (id: string) => void;
  duplicateMagicReveal: (id: string) => void;
  selectMagicReveal: (id?: string) => void;
  runMagicSafetyScan: () => void;
  setPreviewUnlockSheet: (open: boolean, scenario?: ViewerUnlockScenario) => void;
  openPreviewUnlockSheet: () => void;
  closePreviewUnlockSheet: () => void;
  updateMagicHiddenRender: (id: string, hiddenRender: MagicReveal["hiddenRender"]) => void;
  updateMagicGeometry: (id: string, geometry: MagicRevealGeometry) => void;
  updateMagicTracking: (id: string, tracking: MagicReveal["tracking"]) => void;
  updateMagicTargetType: (id: string, targetType: MagicReveal["targetType"]) => void;
  updateMagicRevealType: (id: string, revealType: MagicReveal["revealType"]) => void;
  updateMagicPricing: (id: string, pricing: NonNullable<MagicReveal["pricing"]>) => void;
  updateMagicReward: (id: string, reward: NonNullable<MagicReveal["reward"]>) => void;
  updateMagicEligibility: (id: string, eligibility: MagicReveal["eligibility"]) => void;
  updateMagicUnlockPolicy: (id: string, unlockPolicy: MagicReveal["unlockPolicy"]) => void;
  updateMonetization: (patch: Partial<StudioMonetizationRule>) => void;
  runRightsScan: () => void;
  runSafetyScan: () => void;
  addCaf: (segment: StudioCAFSegment) => void;
  updateCaf: (id: string, patch: Partial<StudioCAFSegment>) => void;
  publishProject: () => void;
  openUnlockSimulator: () => void;
  closeUnlockSimulator: () => void;
  simulateRevealUnlock: (revealId: string, amountOverride?: number) => void;
  confirmRevealUnlock: (revealId: string, amountOverride?: number) => void;
  mockVerifyUnlock: (unlockId: string) => void;
  mockReleaseSettlement: (unlockId: string) => void;
  mockRefundUnlock: (unlockId: string) => void;
  selectUnlock: (id?: string) => void;
  openWalletPanel: () => void;
  closeWalletPanel: () => void;
  setSettlementSummaryOpen: (open: boolean) => void;
  addLedgerEntries: (entries: StudioLedgerEntry[]) => void;
  updateWalletAccounts: (accounts: StudioWalletAccount[]) => void;
  setBackendSyncStatus: (status: StudioState["backendSyncStatus"]) => void;
  logBackendEvent: (eventType: string, payload?: Record<string, unknown>) => void;
  setSelectedBackendPanel: (tab: StudioBackendPanelTab) => void;
  setStudioBackendMode: (mode: BackendMode) => void;
  setBackendConfig: (patch: Partial<StudioBackendConfig>) => void;
  checkBackendHealth: () => void;
  initializePersistenceAdapter: () => void;
  testBackendConnectionMock: () => void;
  openBackendPanel: () => void;
  closeBackendPanel: () => void;
  saveToMockPersistence: () => Promise<void>;
  hydrateFromMockPersistence: () => Promise<void>;
  persistMagicRevealsToMock: () => Promise<void>;
  persistPostPackageToMock: () => Promise<void>;
  persistCampaignToMock: () => Promise<void>;
  createMockLedgerPersist: () => Promise<void>;
  clearMockPersistenceStores: () => void;
  exportMockPersistenceJson: () => string;
  importMockPersistenceJson: (json: string) => Promise<void>;
  setPublishTarget: (publishTarget: PublishTarget) => void;
  setPostVisibility: (visibility: PostVisibility) => void;
  setPostCaption: (caption: string) => void;
  setPostHashtags: (hashtags: string[]) => void;
  setMonetizationMode: (monetizationMode: PostMonetizationMode) => void;
  runPublishValidation: () => void;
  buildPostPackage: () => void;
  openPublishPanel: () => void;
  closePublishPanel: () => void;
  openRuntimePreview: () => void;
  closeRuntimePreview: () => void;
  openSafetyReportPanel: () => void;
  closeSafetyReportPanel: () => void;
  openRightsReportPanel: () => void;
  closeRightsReportPanel: () => void;
  updateDisclosure: (id: string, patch: Partial<PostDisclosure>) => void;
  acceptDisclosureRequirement: (id: string) => void;
  openVerificationPanel: () => void;
  closeVerificationPanel: () => void;
  openRiskMonitor: () => void;
  closeRiskMonitor: () => void;
  selectVerificationRecord: (id?: string) => void;
  selectDispute: (id?: string) => void;
  setUnlockVerificationSim: (patch: Partial<StudioUnlockVerificationSim>) => void;
  createPopsChallenge: (method: POPSMethod, revealId?: string, campaignId?: string) => void;
  completePopsChallenge: (challengeId: string, passed: boolean) => void;
  expirePopsChallenge: (challengeId: string) => void;
  createDispute: (input: Omit<CreateDisputeInput, "nowIso">) => void;
  collectDisputeEvidence: (disputeId: string) => void;
  resolveDispute: (disputeId: string, resolution: DisputeResolution) => void;
  applyTrustImpactMock: (verificationId?: string, fraudAssessmentId?: string) => void;
  completeCampaignActionMock: () => void;
};

export type StudioController = {
  state: StudioState;
  dispatch: Dispatch<StudioAction>;
  actions: StudioActions;
};

function makeMockAsset(name: string, type: StudioAssetType): StudioAsset {
  const t = new Date().toISOString();
  const id = `asset_${Date.now()}`;
  const base = {
    id,
    type,
    name,
    sourceUrl: `blob:mock-${id}`,
    mimeType: type === "video" ? "video/mp4" : type === "audio" ? "audio/aac" : "image/jpeg",
    sizeBytes: 2_400_000,
    status: "ready" as const,
    createdAt: t,
  };
  if (type === "video" || type === "audio") {
    return { ...base, durationMs: 32_000, width: 1080, height: 1920 };
  }
  if (type === "image") {
    return { ...base, width: 1440, height: 1800 };
  }
  return base;
}

export function useStudioController(): StudioController {
  const [state, dispatch] = useReducer(studioReducer, undefined, createInitialStudioState);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const actions = useMemo<StudioActions>(
    () => ({
      setMode: (mode: StudioMode) => dispatch({ type: "SET_MODE", mode }),
      setActiveTool: (tool: StudioTool) => dispatch({ type: "SET_ACTIVE_TOOL", tool }),
      setAspectRatio: (aspectRatio: AspectRatio) => dispatch({ type: "SET_ASPECT_RATIO", aspectRatio }),
      setPlayhead: (playheadMs: number) => dispatch({ type: "SET_PLAYHEAD", playheadMs }),
      togglePlayback: () => dispatch({ type: "TOGGLE_PLAYBACK" }),
      setPlaying: (isPlaying: boolean) => dispatch({ type: "SET_PLAYING", isPlaying }),
      selectClip: (clipId?: string) => dispatch({ type: "SELECT_CLIP", clipId }),
      selectTrack: (trackId?: string) => dispatch({ type: "SELECT_TRACK", trackId }),
      addAsset: (asset: StudioAsset) => dispatch({ type: "ADD_ASSET", asset }),
      mockUploadAsset: (asset: StudioAsset) => dispatch({ type: "MOCK_UPLOAD_ASSET", asset }),
      addTrack: (track: StudioTrack) => dispatch({ type: "ADD_TRACK", track }),
      addClip: (clip: StudioClip) => dispatch({ type: "ADD_CLIP", clip }),
      updateClip: (clipId: string, patch: Partial<StudioClip>) => dispatch({ type: "UPDATE_CLIP", clipId, patch }),
      trimClip: (clipId: string, timelineStartMs: number, timelineEndMs: number) =>
        dispatch({ type: "TRIM_CLIP", clipId, timelineStartMs, timelineEndMs }),
      splitClip: (clipId: string, atMs: number) => dispatch({ type: "SPLIT_CLIP", clipId, atMs }),
      deleteClip: (clipId: string) => dispatch({ type: "DELETE_CLIP", clipId }),
      addOverlay: (overlay: StudioTextOverlay) => dispatch({ type: "ADD_OVERLAY", overlay }),
      updateOverlay: (overlayId: string, patch: Partial<StudioTextOverlay>) =>
        dispatch({ type: "UPDATE_OVERLAY", overlayId, patch }),
      toggleTrackVisibility: (trackId: string) => dispatch({ type: "TOGGLE_TRACK_VISIBILITY", trackId }),
      toggleTrackLock: (trackId: string) => dispatch({ type: "TOGGLE_TRACK_LOCK", trackId }),
      toggleTrackMute: (trackId: string) => dispatch({ type: "TOGGLE_TRACK_MUTE", trackId }),
      setExportSettings: (patch: Partial<StudioExportSettings>) => dispatch({ type: "SET_EXPORT_SETTINGS", patch }),
      startExport: () => dispatch({ type: "START_EXPORT" }),
      updateExportProgress: (progress: number) => dispatch({ type: "UPDATE_EXPORT_PROGRESS", progress }),
      completeExport: () => dispatch({ type: "COMPLETE_EXPORT" }),
      saveProject: () => dispatch({ type: "SAVE_PROJECT" }),
      setZoom: (zoom: number) => dispatch({ type: "SET_ZOOM", zoom }),
      setInspectorOpen: (open: boolean) => dispatch({ type: "SET_INSPECTOR_OPEN", open }),
      setUploadState: (uploadState: StudioUploadState) => dispatch({ type: "SET_UPLOAD_STATE", uploadState }),
      undo: () => dispatch({ type: "UNDO" }),
      redo: () => dispatch({ type: "REDO" }),
      logEvent: (eventType: string, payload?: Record<string, unknown>) =>
        dispatch({ type: "LOG_EVENT", eventType, payload }),
      createMockUploadedAsset: (name: string, type: StudioAssetType) => makeMockAsset(name, type),
      setMagicTab: (tab: MagicPanelTab) => dispatch({ type: "SET_MAGIC_TAB", tab }),
      setMagicTarget: (target: string | null) => dispatch({ type: "SET_MAGIC_TARGET", target }),
      createMagicReveal: (reveal: MagicReveal) => dispatch({ type: "CREATE_MAGIC_REVEAL", reveal }),
      updateMagicReveal: (id: string, patch: Partial<MagicReveal>) =>
        dispatch({ type: "UPDATE_MAGIC_REVEAL", id, patch }),
      deleteMagicReveal: (id: string) => dispatch({ type: "DELETE_MAGIC_REVEAL", id }),
      duplicateMagicReveal: (id: string) => dispatch({ type: "DUPLICATE_MAGIC_REVEAL", id }),
      selectMagicReveal: (id?: string) => dispatch({ type: "SELECT_MAGIC_REVEAL", id }),
      runMagicSafetyScan: () => dispatch({ type: "RUN_MAGIC_SAFETY_SCAN" }),
      setPreviewUnlockSheet: (open: boolean, scenario?: ViewerUnlockScenario) =>
        dispatch({ type: "SET_PREVIEW_UNLOCK_SHEET", open, scenario }),
      openPreviewUnlockSheet: () => dispatch({ type: "OPEN_PREVIEW_UNLOCK_SHEET" }),
      closePreviewUnlockSheet: () => dispatch({ type: "CLOSE_PREVIEW_UNLOCK_SHEET" }),
      updateMagicHiddenRender: (id: string, hiddenRender: MagicReveal["hiddenRender"]) =>
        dispatch({ type: "UPDATE_MAGIC_HIDDEN_RENDER", id, hiddenRender }),
      updateMagicGeometry: (id: string, geometry: MagicRevealGeometry) =>
        dispatch({ type: "UPDATE_MAGIC_GEOMETRY", id, geometry }),
      updateMagicTracking: (id: string, tracking: MagicReveal["tracking"]) =>
        dispatch({ type: "UPDATE_MAGIC_TRACKING", id, tracking }),
      updateMagicTargetType: (id: string, targetType: MagicReveal["targetType"]) =>
        dispatch({ type: "UPDATE_MAGIC_TARGET_TYPE", id, targetType }),
      updateMagicRevealType: (id: string, revealType: MagicReveal["revealType"]) =>
        dispatch({ type: "UPDATE_MAGIC_REVEAL_TYPE", id, revealType }),
      updateMagicPricing: (id: string, pricing: NonNullable<MagicReveal["pricing"]>) =>
        dispatch({ type: "UPDATE_MAGIC_PRICING", id, pricing }),
      updateMagicReward: (id: string, reward: NonNullable<MagicReveal["reward"]>) =>
        dispatch({ type: "UPDATE_MAGIC_REWARD", id, reward }),
      updateMagicEligibility: (id: string, eligibility: MagicReveal["eligibility"]) =>
        dispatch({ type: "UPDATE_MAGIC_ELIGIBILITY", id, eligibility }),
      updateMagicUnlockPolicy: (id: string, unlockPolicy: MagicReveal["unlockPolicy"]) =>
        dispatch({ type: "UPDATE_MAGIC_UNLOCK_POLICY", id, unlockPolicy }),
      updateMonetization: (patch: Partial<StudioMonetizationRule>) => dispatch({ type: "UPDATE_MONETIZATION", patch }),
      runRightsScan: () => dispatch({ type: "RUN_RIGHTS_SCAN" }),
      runSafetyScan: () => dispatch({ type: "RUN_SAFETY_SCAN" }),
      addCaf: (segment: StudioCAFSegment) => dispatch({ type: "ADD_CAF", segment }),
      updateCaf: (id: string, patch: Partial<StudioCAFSegment>) => dispatch({ type: "UPDATE_CAF", id, patch }),
      publishProject: () => dispatch({ type: "PUBLISH_PROJECT" }),
      openUnlockSimulator: () => dispatch({ type: "OPEN_UNLOCK_SIMULATOR" }),
      closeUnlockSimulator: () => dispatch({ type: "CLOSE_UNLOCK_SIMULATOR" }),
      simulateRevealUnlock: (revealId: string, amountOverride?: number) =>
        dispatch({ type: "SIMULATE_REVEAL_UNLOCK", revealId, amountOverride }),
      confirmRevealUnlock: (revealId: string, amountOverride?: number) =>
        dispatch({ type: "CONFIRM_REVEAL_UNLOCK", revealId, amountOverride }),
      mockVerifyUnlock: (unlockId: string) => dispatch({ type: "MOCK_VERIFY_UNLOCK", unlockId }),
      mockReleaseSettlement: (unlockId: string) => dispatch({ type: "MOCK_RELEASE_SETTLEMENT", unlockId }),
      mockRefundUnlock: (unlockId: string) => dispatch({ type: "MOCK_REFUND_UNLOCK", unlockId }),
      selectUnlock: (id?: string) => dispatch({ type: "SELECT_UNLOCK", id }),
      openWalletPanel: () => dispatch({ type: "OPEN_WALLET_PANEL" }),
      closeWalletPanel: () => dispatch({ type: "CLOSE_WALLET_PANEL" }),
      setSettlementSummaryOpen: (open: boolean) => dispatch({ type: "SET_SETTLEMENT_SUMMARY_OPEN", open }),
      addLedgerEntries: (entries: StudioLedgerEntry[]) => dispatch({ type: "ADD_LEDGER_ENTRIES", entries }),
      updateWalletAccounts: (accounts: StudioWalletAccount[]) =>
        dispatch({ type: "UPDATE_WALLET_ACCOUNTS", accounts }),
      setBackendSyncStatus: (status: StudioState["backendSyncStatus"]) =>
        dispatch({ type: "SET_BACKEND_SYNC_STATUS", status }),
      logBackendEvent: (eventType: string, payload?: Record<string, unknown>) =>
        dispatch({ type: "LOG_BACKEND_EVENT", eventType, payload }),
      setSelectedBackendPanel: (tab: StudioBackendPanelTab) => dispatch({ type: "SET_SELECTED_BACKEND_PANEL", tab }),
      setStudioBackendMode: (mode: BackendMode) => dispatch({ type: "SET_BACKEND_MODE", mode }),
      setBackendConfig: (patch: Partial<StudioBackendConfig>) => dispatch({ type: "SET_BACKEND_CONFIG", patch }),
      checkBackendHealth: () => dispatch({ type: "CHECK_BACKEND_HEALTH" }),
      initializePersistenceAdapter: () => dispatch({ type: "INITIALIZE_PERSISTENCE_ADAPTER" }),
      testBackendConnectionMock: () =>
        dispatch({
          type: "LOG_BACKEND_EVENT",
          eventType: STUDIO_BACKEND_EVENTS.mockConnectionTest,
          payload: { ok: true, note: "No network; mock path only." },
        }),
      openBackendPanel: () => dispatch({ type: "OPEN_BACKEND_PANEL" }),
      closeBackendPanel: () => dispatch({ type: "CLOSE_BACKEND_PANEL" }),
      saveToMockPersistence: async () => {
        const s = stateRef.current;
        dispatch({ type: "SET_BACKEND_SYNC_STATUS", status: "syncing" });
        dispatch({
          type: "LOG_BACKEND_EVENT",
          eventType: STUDIO_BACKEND_EVENTS.syncStarted,
          payload: { op: "save_project" },
        });
        const r = await s.repository.syncLocalStateToPersistence(s.project);
        if (!r.project.ok) {
          dispatch({
            type: "LOG_BACKEND_EVENT",
            eventType: STUDIO_BACKEND_EVENTS.projectPersistFailed,
            payload: { error: r.project.error },
          });
          dispatch({ type: "SET_BACKEND_SYNC_STATUS", status: "error" });
          return;
        }
        dispatch({
          type: "SET_PERSISTED_SNAPSHOT_META",
          meta: { projectId: s.project.id, savedAt: new Date().toISOString() },
        });
        dispatch({
          type: "LOG_BACKEND_EVENT",
          eventType: STUDIO_BACKEND_EVENTS.projectPersisted,
          payload: { projectId: s.project.id },
        });
        dispatch({ type: "SET_BACKEND_SYNC_STATUS", status: "ok" });
      },
      hydrateFromMockPersistence: async () => {
        const s = stateRef.current;
        dispatch({ type: "SET_BACKEND_SYNC_STATUS", status: "syncing" });
        dispatch({ type: "LOG_BACKEND_EVENT", eventType: STUDIO_BACKEND_EVENTS.syncStarted, payload: { op: "hydrate" } });
        const res = await s.repository.hydrateStudioStateFromPersistence(s.project.id, s.project);
        if (!res.ok) {
          dispatch({
            type: "LOG_BACKEND_EVENT",
            eventType: STUDIO_BACKEND_EVENTS.syncFailed,
            payload: { error: res.error },
          });
          dispatch({ type: "SET_BACKEND_SYNC_STATUS", status: "error" });
          return;
        }
        dispatch({ type: "HYDRATE_PROJECT", project: res.data });
        dispatch({ type: "LOG_BACKEND_EVENT", eventType: STUDIO_BACKEND_EVENTS.syncCompleted, payload: { op: "hydrate" } });
        dispatch({ type: "SET_BACKEND_SYNC_STATUS", status: "ok" });
      },
      persistMagicRevealsToMock: async () => {
        const s = stateRef.current;
        dispatch({
          type: "LOG_BACKEND_EVENT",
          eventType: STUDIO_BACKEND_EVENTS.magicPersistRequested,
          payload: {},
        });
        const results = await s.repository.persistMagicReveals(s.project);
        const failed = results.find(
          (x: ApiResponse<PersistentMagicReveal>): x is Extract<ApiResponse<PersistentMagicReveal>, { ok: false }> => !x.ok
        );
        if (failed) {
          dispatch({
            type: "LOG_BACKEND_EVENT",
            eventType: STUDIO_BACKEND_EVENTS.magicValidationFailed,
            payload: { error: failed.error },
          });
          return;
        }
        dispatch({ type: "LOG_BACKEND_EVENT", eventType: STUDIO_BACKEND_EVENTS.magicPersisted, payload: { count: results.length } });
      },
      persistPostPackageToMock: async () => {
        const s = stateRef.current;
        if (!s.project.postPackage) {
          dispatch({
            type: "LOG_BACKEND_EVENT",
            eventType: STUDIO_BACKEND_EVENTS.publishBlocked,
            payload: { reason: "no_post_package" },
          });
          return;
        }
        dispatch({
          type: "LOG_BACKEND_EVENT",
          eventType: STUDIO_BACKEND_EVENTS.publishValidationRequested,
          payload: {},
        });
        const res = await s.repository.persistPublishPackage(s.project, s.project.postPackage);
        if (!res.ok) {
          dispatch({ type: "LOG_BACKEND_EVENT", eventType: STUDIO_BACKEND_EVENTS.publishBlocked, payload: { error: res.error } });
          return;
        }
        dispatch({ type: "LOG_BACKEND_EVENT", eventType: STUDIO_BACKEND_EVENTS.publishPackageCreated, payload: { id: res.data.id } });
      },
      persistCampaignToMock: async () => {
        const s = stateRef.current;
        const res = await s.repository.persistCampaign(s.project);
        if (!res.ok) {
          dispatch({ type: "LOG_BACKEND_EVENT", eventType: STUDIO_BACKEND_EVENTS.syncFailed, payload: { error: res.error } });
          return;
        }
        dispatch({ type: "LOG_BACKEND_EVENT", eventType: STUDIO_BACKEND_EVENTS.campaignPersisted, payload: { id: res.data.id } });
      },
      createMockLedgerPersist: async () => {
        const s = stateRef.current;
        const t = new Date().toISOString();
        const entry: StudioLedgerEntry = {
          id: `ledger_mock_${Date.now()}`,
          type: "magic_unlock_tip",
          status: "pending",
          coin: "iCoin",
          amount: 100,
          fromAccountId: s.walletAccounts[0]?.id,
          toAccountId: s.walletAccounts[1]?.id,
          projectId: s.project.id,
          description: "Mock persisted ledger line (Stage 8)",
          createdAt: t,
        };
        dispatch({
          type: "LOG_BACKEND_EVENT",
          eventType: STUDIO_BACKEND_EVENTS.ledgerTransactionRequested,
          payload: { entryId: entry.id },
        });
        const res = await s.repository.persistUnlockTransaction([entry]);
        if (!res.ok) {
          dispatch({
            type: "LOG_BACKEND_EVENT",
            eventType: STUDIO_BACKEND_EVENTS.ledgerTransactionRejected,
            payload: { error: res.error },
          });
          return;
        }
        dispatch({ type: "ADD_LEDGER_ENTRIES", entries: [entry] });
        dispatch({
          type: "LOG_BACKEND_EVENT",
          eventType: STUDIO_BACKEND_EVENTS.ledgerTransactionCreated,
          payload: { entryId: entry.id },
        });
      },
      clearMockPersistenceStores: () => {
        const s = stateRef.current;
        if (s.persistenceAdapter instanceof StudioMockPersistenceAdapter) {
          s.persistenceAdapter.clearAll();
        }
        dispatch({ type: "SET_PERSISTED_SNAPSHOT_META", meta: null });
        dispatch({ type: "LOG_BACKEND_EVENT", eventType: STUDIO_BACKEND_EVENTS.syncCompleted, payload: { op: "clear_mock" } });
      },
      exportMockPersistenceJson: () => {
        const s = stateRef.current;
        if (s.persistenceAdapter instanceof StudioMockPersistenceAdapter) {
          return JSON.stringify(s.persistenceAdapter.exportSnapshot(), null, 2);
        }
        return "{}";
      },
      importMockPersistenceJson: async (json: string) => {
        const s = stateRef.current;
        const adapter = s.persistenceAdapter;
        if (!(adapter instanceof StudioMockPersistenceAdapter)) return;
        try {
          const obj = JSON.parse(json) as Record<string, unknown>;
          adapter.importSnapshot(obj);
          dispatch({ type: "LOG_BACKEND_EVENT", eventType: STUDIO_BACKEND_EVENTS.syncCompleted, payload: { op: "import_snapshot" } });
          const firstId = [...adapter.projects.keys()][0];
          if (firstId) {
            const res = await s.repository.hydrateStudioStateFromPersistence(firstId, s.project);
            if (res.ok) {
              dispatch({ type: "HYDRATE_PROJECT", project: res.data });
            }
          }
        } catch (e) {
          dispatch({
            type: "LOG_BACKEND_EVENT",
            eventType: STUDIO_BACKEND_EVENTS.syncFailed,
            payload: { message: String(e) },
          });
        }
      },
      setPublishTarget: (publishTarget: PublishTarget) => dispatch({ type: "SET_PUBLISH_TARGET", publishTarget }),
      setPostVisibility: (visibility: PostVisibility) => dispatch({ type: "SET_POST_VISIBILITY", visibility }),
      setPostCaption: (caption: string) => dispatch({ type: "SET_POST_CAPTION", caption }),
      setPostHashtags: (hashtags: string[]) => dispatch({ type: "SET_POST_HASHTAGS", hashtags }),
      setMonetizationMode: (monetizationMode: PostMonetizationMode) =>
        dispatch({ type: "SET_MONETIZATION_MODE", monetizationMode }),
      runPublishValidation: () => dispatch({ type: "RUN_PUBLISH_VALIDATION" }),
      buildPostPackage: () => dispatch({ type: "BUILD_POST_PACKAGE" }),
      openPublishPanel: () => dispatch({ type: "OPEN_PUBLISH_PANEL" }),
      closePublishPanel: () => dispatch({ type: "CLOSE_PUBLISH_PANEL" }),
      openRuntimePreview: () => dispatch({ type: "OPEN_RUNTIME_PREVIEW" }),
      closeRuntimePreview: () => dispatch({ type: "CLOSE_RUNTIME_PREVIEW" }),
      openSafetyReportPanel: () => dispatch({ type: "OPEN_SAFETY_REPORT_PANEL" }),
      closeSafetyReportPanel: () => dispatch({ type: "CLOSE_SAFETY_REPORT_PANEL" }),
      openRightsReportPanel: () => dispatch({ type: "OPEN_RIGHTS_REPORT_PANEL" }),
      closeRightsReportPanel: () => dispatch({ type: "CLOSE_RIGHTS_REPORT_PANEL" }),
      updateDisclosure: (id: string, patch: Partial<PostDisclosure>) =>
        dispatch({ type: "UPDATE_DISCLOSURE", id, patch }),
      acceptDisclosureRequirement: (id: string) => dispatch({ type: "ACCEPT_DISCLOSURE_REQUIREMENT", id }),
      openVerificationPanel: () => dispatch({ type: "OPEN_VERIFICATION_PANEL" }),
      closeVerificationPanel: () => dispatch({ type: "CLOSE_VERIFICATION_PANEL" }),
      openRiskMonitor: () => dispatch({ type: "OPEN_RISK_MONITOR" }),
      closeRiskMonitor: () => dispatch({ type: "CLOSE_RISK_MONITOR" }),
      selectVerificationRecord: (id?: string) => dispatch({ type: "SELECT_VERIFICATION_RECORD", id }),
      selectDispute: (id?: string) => dispatch({ type: "SELECT_DISPUTE", id }),
      setUnlockVerificationSim: (patch: Partial<StudioUnlockVerificationSim>) =>
        dispatch({ type: "SET_UNLOCK_VERIFICATION_SIM", patch }),
      createPopsChallenge: (method: POPSMethod, revealId?: string, campaignId?: string) =>
        dispatch({ type: "CREATE_POPS_CHALLENGE", method, revealId, campaignId }),
      completePopsChallenge: (challengeId: string, passed: boolean) =>
        dispatch({ type: "COMPLETE_POPS_CHALLENGE", challengeId, passed }),
      expirePopsChallenge: (challengeId: string) => dispatch({ type: "EXPIRE_POPS_CHALLENGE", challengeId }),
      createDispute: (input: Omit<CreateDisputeInput, "nowIso">) => dispatch({ type: "CREATE_DISPUTE", input }),
      collectDisputeEvidence: (disputeId: string) => dispatch({ type: "COLLECT_DISPUTE_EVIDENCE", disputeId }),
      resolveDispute: (disputeId: string, resolution: DisputeResolution) =>
        dispatch({ type: "RESOLVE_DISPUTE", disputeId, resolution }),
      applyTrustImpactMock: (verificationId?: string, fraudAssessmentId?: string) =>
        dispatch({ type: "APPLY_TRUST_IMPACT_MOCK", verificationId, fraudAssessmentId }),
      completeCampaignActionMock: () => dispatch({ type: "COMPLETE_CAMPAIGN_ACTION_MOCK" }),
    }),
    [dispatch]
  );

  return useMemo(() => ({ state, dispatch, actions }), [state, dispatch, actions]);
}
