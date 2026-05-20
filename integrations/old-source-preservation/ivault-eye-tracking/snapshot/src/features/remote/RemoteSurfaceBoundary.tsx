import { type ReactNode, useEffect } from "react";
import { useRemote } from "./useRemote";
import type { RemoteActiveContext, RemoteSurface } from "./types";

export interface RemoteSurfaceBoundaryProps {
  surface: RemoteSurface;
  activeContext?: RemoteActiveContext;
  children: ReactNode;
}

export function RemoteSurfaceBoundary({
  surface,
  activeContext = {},
  children,
}: RemoteSurfaceBoundaryProps) {
  const { setRemoteSurface } = useRemote();

  useEffect(() => {
    setRemoteSurface(surface, activeContext);
  }, [
    surface,
    activeContext.contentId,
    activeContext.offerId,
    activeContext.campaignId,
    activeContext.walletActionId,
    activeContext.creatorId,
    activeContext.platformId,
    activeContext.transactionId,
    setRemoteSurface,
  ]);

  return <>{children}</>;
}
