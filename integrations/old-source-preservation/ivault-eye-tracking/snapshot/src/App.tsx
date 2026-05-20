import "./features/remote/remote.css";

import { useEffect, useState } from "react";
import { AppShell } from "./AppShell";
// Temporary P.O.P.S MVP demo mount — removable; see docs/pops/POPS_MVP_LOCAL_README.md
import {
  RemoteCommandCenter,
  RemoteOrb,
  RemoteProvider,
  RemoteQuickPanel,
  RemoteSettingsSheet,
} from "./features/remote";
import StudioScreen from "./screens/StudioScreen";
import IGoScreen from "./screens/IGoScreen";
import { IHomeScreen } from "./screens/IHomeScreen";
import IvatarStudioScreen from "./screens/ivatar/IvatarStudioScreen";
import IvatarTryOnScreen from "./screens/ivatar/IvatarTryOnScreen";
import IvatarWorldsScreen from "./screens/ivatar/IvatarWorldsScreen";
import IvatarOrderSummaryScreen from "./screens/ivatar/IvatarOrderSummaryScreen";

export function App() {
  const [, setBump] = useState(0);
  useEffect(() => {
    const onNav = () => setBump((v) => v + 1);
    window.addEventListener("popstate", onNav);
    return () => window.removeEventListener("popstate", onNav);
  }, []);

  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";

  const isICommandDevRoute = pathname === "/dev/i-command";
  const isIgoDevRoute = pathname === "/dev/igo";
  const isIvatarStudio = pathname === "/ivatar/studio";
  const isIvatarTryon = pathname === "/ivatar/tryon";
  const isIvatarWorlds = pathname === "/ivatar/worlds";
  const isIvatarOrder = pathname === "/ivatar/order-summary";

  return (
    <RemoteProvider
      initialSurface="feed"
      userPolicy={{
        ageGroup: "adult",
        kycVerified: true,
        trustTier: 3,
        walletLocked: false,
        fraudHoldActive: false,
        campaignBudgetAvailable: true,
        canPublishCampaign: true,
        canWithdraw: true,
        canPay: true,
        canTip: true,
      }}
    >
      <AppShell>
        {isICommandDevRoute ? (
          <IHomeScreen />
        ) : isIgoDevRoute ? (
          <IGoScreen />
        ) : isIvatarStudio ? (
          <IvatarStudioScreen />
        ) : isIvatarTryon ? (
          <IvatarTryOnScreen />
        ) : isIvatarWorlds ? (
          <IvatarWorldsScreen />
        ) : isIvatarOrder ? (
          <IvatarOrderSummaryScreen />
        ) : (
          <StudioScreen />
        )}
      </AppShell>

      <RemoteSettingsSheet />
      <RemoteCommandCenter />
      <RemoteQuickPanel />
      <RemoteOrb />
    </RemoteProvider>
  );
}
