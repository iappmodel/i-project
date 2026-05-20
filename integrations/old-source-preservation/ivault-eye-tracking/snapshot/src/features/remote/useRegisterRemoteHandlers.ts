import { useEffect } from "react";

import { useRemote } from "./useRemote";
import type {
  RemoteCommand,
  RemoteCommandHandlerMap,
} from "./types";

export interface RemoteHandlerApi {
  navigate?: (target: string) => void;

  feed?: {
    next?: () => void;
    previous?: () => void;
    reveal?: () => void;
    hide?: () => void;
    like?: (contentId?: string) => void;
    save?: (contentId?: string) => void;
    comment?: (contentId?: string) => void;
    share?: (contentId?: string) => void;
    mute?: () => void;
    unmute?: () => void;
    report?: (contentId?: string) => void;
  };

  earn?: {
    openOffer?: (offerId?: string) => void;
    startWatch?: (offerId?: string, contentId?: string) => void;
    acceptOffer?: (offerId?: string) => void;
    declineOffer?: (offerId?: string) => void;
    viewRequirements?: (offerId?: string) => void;
    startVerification?: (offerId?: string) => void;
    releaseReward?: (offerId?: string) => void;
  };

  wallet?: {
    open?: () => void;
    openPending?: () => void;
    convert?: (walletActionId?: string) => void;
    withdraw?: (walletActionId?: string) => void;
    pay?: (walletActionId?: string) => void;
    tip?: (creatorId?: string, contentId?: string) => void;
    viewLimits?: () => void;
    viewHistory?: () => void;
  };

  studio?: {
    open?: (contentId?: string) => void;
    play?: () => void;
    pause?: () => void;
    undo?: () => void;
    redo?: () => void;
    changeAspectRatio?: () => void;
    exportMedia?: (contentId?: string) => void;
    addText?: () => void;
    addLayer?: () => void;
  };

  campaign?: {
    openBuilder?: (campaignId?: string) => void;
    publish?: (campaignId?: string) => void;
    saveDraft?: (campaignId?: string) => void;
    pause?: (campaignId?: string) => void;
  };

  connectors?: {
    open?: () => void;
    connect?: (platformId?: string) => void;
    disconnect?: (platformId?: string) => void;
    sync?: (platformId?: string) => void;
    viewImportedContent?: (platformId?: string) => void;
  };

  presenter?: {
    next?: () => void;
    previous?: () => void;
    reveal?: () => void;
  };

  ui?: {
    openSheet?: () => void;
    closeSheet?: () => void;
    toggleFullscreen?: () => void;
    cancelAction?: () => void;
    toast?: (message: string) => void;
  };
}

export function useRegisterRemoteHandlers(api: RemoteHandlerApi) {
  const { registerRemoteHandlers } = useRemote();

  useEffect(() => {
    const handlers: RemoteCommandHandlerMap = {
      GO_BACK: () => window.history.back(),

      GO_HOME: () => api.navigate?.("feed"),
      GO_FEED: () => api.navigate?.("feed"),
      GO_EARN: () => api.navigate?.("earn"),
      GO_WALLET: () => api.wallet?.open?.() ?? api.navigate?.("wallet"),
      GO_PROFILE: () => api.navigate?.("profile"),

      NEXT_ITEM: (command) => {
        if (command.surface === "presenter") {
          api.presenter?.next?.();
          return;
        }

        api.feed?.next?.();
      },

      PREVIOUS_ITEM: (command) => {
        if (command.surface === "presenter") {
          api.presenter?.previous?.();
          return;
        }

        api.feed?.previous?.();
      },

      OPEN_SHEET: () => api.ui?.openSheet?.(),
      CLOSE_SHEET: () => api.ui?.closeSheet?.(),
      TOGGLE_FULLSCREEN: () => api.ui?.toggleFullscreen?.(),

      LIKE_CONTENT: (command) => api.feed?.like?.(getContentId(command)),
      SAVE_CONTENT: (command) => api.feed?.save?.(getContentId(command)),
      COMMENT_CONTENT: (command) => api.feed?.comment?.(getContentId(command)),
      SHARE_CONTENT: (command) => api.feed?.share?.(getContentId(command)),
      REPORT_CONTENT: (command) => api.feed?.report?.(getContentId(command)),

      REVEAL_METADATA: (command) => {
        if (command.surface === "presenter") {
          api.presenter?.reveal?.();
          return;
        }

        api.feed?.reveal?.();
      },

      HIDE_METADATA: () => api.feed?.hide?.(),
      MUTE_CONTENT: () => api.feed?.mute?.(),
      UNMUTE_CONTENT: () => api.feed?.unmute?.(),

      START_WATCH: (command) =>
        api.earn?.startWatch?.(getOfferId(command), getContentId(command)),

      START_VERIFICATION: (command) =>
        api.earn?.startVerification?.(getOfferId(command)),

      RELEASE_REWARD: (command) =>
        api.earn?.releaseReward?.(getOfferId(command)),

      OPEN_OFFER: (command) => api.earn?.openOffer?.(getOfferId(command)),
      ACCEPT_OFFER: (command) => api.earn?.acceptOffer?.(getOfferId(command)),
      DECLINE_OFFER: (command) => api.earn?.declineOffer?.(getOfferId(command)),
      VIEW_REQUIREMENTS: (command) =>
        api.earn?.viewRequirements?.(getOfferId(command)),

      OPEN_WALLET: () => api.wallet?.open?.() ?? api.navigate?.("wallet"),
      OPEN_PENDING: () => api.wallet?.openPending?.() ?? api.navigate?.("pending"),

      CONVERT_COINS: (command) =>
        api.wallet?.convert?.(getWalletActionId(command)),

      WITHDRAW: (command) =>
        api.wallet?.withdraw?.(getWalletActionId(command)),

      PAY: (command) => api.wallet?.pay?.(getWalletActionId(command)),

      TIP: (command) =>
        api.wallet?.tip?.(getCreatorId(command), getContentId(command)),

      VIEW_LIMITS: () => api.wallet?.viewLimits?.(),
      VIEW_HISTORY: () => api.wallet?.viewHistory?.(),

      OPEN_STUDIO: (command) => api.studio?.open?.(getContentId(command)),
      PLAY_PREVIEW: () => api.studio?.play?.(),
      PAUSE_PREVIEW: () => api.studio?.pause?.(),
      UNDO_EDIT: () => api.studio?.undo?.(),
      REDO_EDIT: () => api.studio?.redo?.(),
      CHANGE_ASPECT_RATIO: () => api.studio?.changeAspectRatio?.(),
      EXPORT_MEDIA: (command) => api.studio?.exportMedia?.(getContentId(command)),
      ADD_TEXT: () => api.studio?.addText?.(),
      ADD_LAYER: () => api.studio?.addLayer?.(),

      OPEN_CAMPAIGN_BUILDER: (command) =>
        api.campaign?.openBuilder?.(getCampaignId(command)),

      PUBLISH_CAMPAIGN: (command) =>
        api.campaign?.publish?.(getCampaignId(command)),

      SAVE_CAMPAIGN_DRAFT: (command) =>
        api.campaign?.saveDraft?.(getCampaignId(command)),

      PAUSE_CAMPAIGN: (command) =>
        api.campaign?.pause?.(getCampaignId(command)),

      OPEN_CONNECTORS: () => api.connectors?.open?.() ?? api.navigate?.("connect"),

      CONNECT_PLATFORM: (command) =>
        api.connectors?.connect?.(getPlatformId(command)),

      DISCONNECT_PLATFORM: (command) =>
        api.connectors?.disconnect?.(getPlatformId(command)),

      SYNC_PLATFORM: (command) => api.connectors?.sync?.(getPlatformId(command)),

      VIEW_IMPORTED_CONTENT: (command) =>
        api.connectors?.viewImportedContent?.(getPlatformId(command)),

      CANCEL_ACTION: () => api.ui?.cancelAction?.(),

      LOCK_REMOTE: () => {
        api.ui?.toast?.("Remote locked.");
      },

      UNLOCK_REMOTE: () => {
        api.ui?.toast?.("Remote unlocked.");
      },

      EMERGENCY_STOP: () => {
        api.ui?.cancelAction?.();
        api.ui?.toast?.("Remote emergency stop triggered.");
      },

      REQUIRE_CONFIRMATION: () => {
        api.ui?.toast?.("Confirmation required.");
      },

      DISABLE_GAZE_CONTROL: () => {
        api.ui?.toast?.("Gaze control disabled.");
      },

      DISABLE_VOICE_CONTROL: () => {
        api.ui?.toast?.("Voice control disabled.");
      },

      CLOSE_REMOTE: () => {
        api.ui?.closeSheet?.();
      },
    };

    registerRemoteHandlers(handlers);
  }, [api, registerRemoteHandlers]);
}

function getPayloadString(command: RemoteCommand, key: string): string | undefined {
  const value = command.payload?.[key];

  if (typeof value === "string") return value;

  return undefined;
}

function getContentId(command: RemoteCommand): string | undefined {
  return (
    getPayloadString(command, "contentId") ??
    getPayloadString(command, "activeContentId")
  );
}

function getOfferId(command: RemoteCommand): string | undefined {
  return (
    getPayloadString(command, "offerId") ??
    getPayloadString(command, "activeOfferId")
  );
}

function getCampaignId(command: RemoteCommand): string | undefined {
  return (
    getPayloadString(command, "campaignId") ??
    getPayloadString(command, "activeCampaignId")
  );
}

function getWalletActionId(command: RemoteCommand): string | undefined {
  return (
    getPayloadString(command, "walletActionId") ??
    getPayloadString(command, "activeWalletActionId")
  );
}

function getCreatorId(command: RemoteCommand): string | undefined {
  return (
    getPayloadString(command, "creatorId") ??
    getPayloadString(command, "activeCreatorId")
  );
}

function getPlatformId(command: RemoteCommand): string | undefined {
  return (
    getPayloadString(command, "platformId") ??
    getPayloadString(command, "activePlatformId")
  );
}
