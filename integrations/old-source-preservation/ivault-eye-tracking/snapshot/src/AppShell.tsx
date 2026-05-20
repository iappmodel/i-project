import type { PropsWithChildren } from "react";
import { useMemo, useState } from "react";

import { useRegisterRemoteHandlers } from "./features/remote";

export function AppShell({ children }: PropsWithChildren) {
  const [screen, setScreen] = useState("feed");

  const remoteHandlers = useMemo(
    () => ({
      navigate: setScreen,

      feed: {
        next: () => console.log("remote: feed next"),
        previous: () => console.log("remote: feed previous"),
        reveal: () => console.log("remote: reveal metadata"),
        hide: () => console.log("remote: hide metadata"),
        like: (contentId?: string) => console.log("remote: like", contentId),
        save: (contentId?: string) => console.log("remote: save", contentId),
        comment: (contentId?: string) => console.log("remote: comment", contentId),
        share: (contentId?: string) => console.log("remote: share", contentId),
        mute: () => console.log("remote: mute"),
        unmute: () => console.log("remote: unmute"),
        report: (contentId?: string) => console.log("remote: report", contentId),
      },

      earn: {
        openOffer: (offerId?: string) => console.log("remote: open offer", offerId),
        startWatch: (offerId?: string, contentId?: string) =>
          console.log("remote: start watch", { offerId, contentId }),
        acceptOffer: (offerId?: string) => console.log("remote: accept offer", offerId),
        declineOffer: (offerId?: string) => console.log("remote: decline offer", offerId),
        viewRequirements: (offerId?: string) =>
          console.log("remote: requirements", offerId),
        startVerification: (offerId?: string) =>
          console.log("remote: start verification", offerId),
        releaseReward: (offerId?: string) =>
          console.log("remote: release reward", offerId),
      },

      wallet: {
        open: () => setScreen("wallet"),
        openPending: () => setScreen("pending"),
        convert: (id?: string) => console.log("remote: convert", id),
        withdraw: (id?: string) => console.log("remote: withdraw", id),
        pay: (id?: string) => console.log("remote: pay", id),
        tip: (creatorId?: string, contentId?: string) =>
          console.log("remote: tip", { creatorId, contentId }),
        viewLimits: () => console.log("remote: wallet limits"),
        viewHistory: () => console.log("remote: wallet history"),
      },

      studio: {
        open: (contentId?: string) => {
          console.log("remote: open studio", contentId);
          setScreen("studio");
        },
        play: () => console.log("remote: studio play"),
        pause: () => console.log("remote: studio pause"),
        undo: () => console.log("remote: studio undo"),
        redo: () => console.log("remote: studio redo"),
        changeAspectRatio: () => console.log("remote: aspect ratio"),
        exportMedia: (contentId?: string) => console.log("remote: export", contentId),
        addText: () => console.log("remote: add text"),
        addLayer: () => console.log("remote: add layer"),
      },

      campaign: {
        openBuilder: (campaignId?: string) => {
          console.log("remote: open campaign", campaignId);
          setScreen("campaign_builder");
        },
        publish: (campaignId?: string) => console.log("remote: publish", campaignId),
        saveDraft: (campaignId?: string) => console.log("remote: save draft", campaignId),
        pause: (campaignId?: string) => console.log("remote: pause campaign", campaignId),
      },

      connectors: {
        open: () => setScreen("connect_platforms"),
        connect: (platformId?: string) => console.log("remote: connect", platformId),
        disconnect: (platformId?: string) =>
          console.log("remote: disconnect", platformId),
        sync: (platformId?: string) => console.log("remote: sync", platformId),
        viewImportedContent: (platformId?: string) =>
          console.log("remote: imported content", platformId),
      },

      presenter: {
        next: () => console.log("remote: presenter next"),
        previous: () => console.log("remote: presenter previous"),
        reveal: () => console.log("remote: presenter reveal"),
      },

      ui: {
        openSheet: () => console.log("remote: open sheet"),
        closeSheet: () => console.log("remote: close sheet"),
        toggleFullscreen: () => console.log("remote: fullscreen"),
        cancelAction: () => console.log("remote: cancel action"),
        toast: (message: string) => console.log(message),
      },
    }),
    []
  );

  useRegisterRemoteHandlers(remoteHandlers);

  return (
    <>
      {children}
      <div data-testid="app-shell-screen" hidden>
        {screen}
      </div>
    </>
  );
}
