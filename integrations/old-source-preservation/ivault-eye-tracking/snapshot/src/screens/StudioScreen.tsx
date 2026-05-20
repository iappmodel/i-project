import React, { useMemo, useState } from "react";
import StudioShell from "../components/studio/StudioShell";
import StudioTopBar from "../components/studio/StudioTopBar";
import StudioToolRail from "../components/studio/StudioToolRail";
import StudioPreview from "../components/studio/StudioPreview";
import StudioTimeline from "../components/studio/StudioTimeline";
import StudioSessionPanel from "../components/studio/StudioSessionPanel";
import StudioClipStrip from "../components/studio/StudioClipStrip";
import StudioCommandPanel from "../components/studio/StudioCommandPanel";
import StudioExportPanel from "../components/studio/StudioExportPanel";
import StudioAutoCutPanel from "../components/studio/StudioAutoCutPanel";
import StudioCleanupPanel from "../components/studio/StudioCleanupPanel";
import StudioPublishPanel from "../components/studio/StudioPublishPanel";
import StudioProofPanel from "../components/studio/StudioProofPanel";

import {
  createInitialStudioState,
  selectClip,
  toggleClipDiscarded,
  setAspectRatio,
  setActiveTool,
  applyStudioCommand,
  selectEditPlan,
  acceptEditPlanPreview,
  rejectEditPlanPreview,
  setAutoCutPanelOpen,
  selectCleanupPlan,
  confirmCleanupPlanPreview,
  rejectCleanupPlanPreview,
  setCleanupPreviewOpen,
  selectPublishPlan,
  markPublishPlanReady,
  mockPublishPlan,
  rejectPublishPlan,
  setPublishPanelOpen,
  generateProofPlan,
  selectProofPlan,
  rejectProofPlan,
  generateProofPackagePreview,
  mockExportProofPackage,
  rejectProofPackage,
  setProofPanelOpen,
} from "../lib/studio/studio-state";
import type { AspectRatio, StudioToolId } from "../lib/studio/studio.types";

const StudioScreen: React.FC = () => {
  const [state, setState] = useState(() => createInitialStudioState());

  const selectedClip = useMemo(
    () => state.activeSession.clips.find((c) => c.id === state.selectedClipId) ?? null,
    [state.activeSession, state.selectedClipId],
  );

  const selectedEditPlan = useMemo(
    () => state.editPlans.find((p) => p.id === state.selectedEditPlanId) ?? null,
    [state.editPlans, state.selectedEditPlanId],
  );

  const selectedCleanupPlan = useMemo(
    () => state.cleanupPlans.find((p) => p.id === state.selectedCleanupPlanId) ?? null,
    [state.cleanupPlans, state.selectedCleanupPlanId],
  );

  const latestCleanupPlan = useMemo(
    () => state.cleanupPlans[0] ?? null,
    [state.cleanupPlans],
  );

  const selectedPublishPlan = useMemo(
    () => state.publishPlans.find((p) => p.id === state.selectedPublishPlanId) ?? null,
    [state.publishPlans, state.selectedPublishPlanId],
  );

  const latestPublishPlan = useMemo(
    () => state.publishPlans[0] ?? null,
    [state.publishPlans],
  );

  const selectedProofPlan = useMemo(
    () => state.proofPlans.find((p) => p.id === state.selectedProofPlanId) ?? null,
    [state.proofPlans, state.selectedProofPlanId],
  );

  const selectedProofPackage = useMemo(
    () => state.proofPackages.find((p) => p.id === state.selectedProofPackageId) ?? null,
    [state.proofPackages, state.selectedProofPackageId],
  );

  const latestProofPackage = useMemo(
    () =>
      selectedProofPlan
        ? (state.proofPackages.find((p) => p.proofPlanId === selectedProofPlan.id) ?? null)
        : null,
    [state.proofPackages, selectedProofPlan],
  );

  // suppress unused-var warnings
  void generateProofPlan;
  void selectedProofPackage;

  function handleSetTool(tool: StudioToolId) {
    setState((s) => setActiveTool(s, tool));
  }

  function handleSelectClip(id: string) {
    setState((s) => selectClip(s, id));
  }

  function handleToggleDiscard(id: string) {
    setState((s) => toggleClipDiscarded(s, id));
  }

  function cycleAspect() {
    const order: AspectRatio[] = ["9:16", "1:1", "16:9"];
    const cur = state.activeSession.aspectRatio;
    const idx = order.indexOf(cur);
    const next = order[(idx + 1) % order.length];
    setState((s) => setAspectRatio(s, next));
  }

  function toggleExport() {
    setState((s) => ({ ...s, exportPanelOpen: !s.exportPanelOpen }));
  }

  function submitCommand(raw: string) {
    if (!raw || !raw.trim()) return;
    setState((s) => applyStudioCommand(s, raw));
  }

  function handlePlayPause() {
    setState((s) => ({ ...s, isPlaying: !s.isPlaying }));
  }

  // ── Auto-cut handlers ────────────────────────────────────────────────────────
  function handleSelectPlan(planId: string) {
    setState((s) => selectEditPlan(s, planId));
  }

  function handleAcceptPlan(planId: string) {
    setState((s) => acceptEditPlanPreview(s, planId));
  }

  function handleRejectPlan(planId: string) {
    setState((s) => rejectEditPlanPreview(s, planId));
  }

  function handleCloseAutoCut() {
    setState((s) => setAutoCutPanelOpen(s, false));
  }

  // ── Cleanup handlers ─────────────────────────────────────────────────────────
  function handleSelectCleanupPlan(planId: string) {
    setState((s) => selectCleanupPlan(s, planId));
  }

  function handleConfirmCleanupPlan(planId: string) {
    setState((s) => confirmCleanupPlanPreview(s, planId));
  }

  function handleRejectCleanupPlan(planId: string) {
    setState((s) => rejectCleanupPlanPreview(s, planId));
  }

  function handleCloseCleanup() {
    setState((s) => setCleanupPreviewOpen(s, false));
  }

  // ── Publish handlers ────────────────────────────────────────────────────────
  function handleSelectPublishPlan(planId: string) {
    setState((s) => selectPublishPlan(s, planId));
  }

  function handleMarkPublishPlanReady(planId: string) {
    setState((s) => markPublishPlanReady(s, planId));
  }

  function handleMockPublishPlan(planId: string) {
    setState((s) => mockPublishPlan(s, planId));
  }

  function handleRejectPublishPlan(planId: string) {
    setState((s) => rejectPublishPlan(s, planId));
  }

  function handleClosePublish() {
    setState((s) => setPublishPanelOpen(s, false));
  }

  // ── Proof handlers ──────────────────────────────────────────────────────────
  function handleSelectProofPlan(proofPlanId: string) {
    setState((s) => selectProofPlan(s, proofPlanId));
  }

  function handleGenerateProofPackage(proofPlanId: string) {
    setState((s) => generateProofPackagePreview(s, proofPlanId));
  }

  function handleExportProofPackage(packageId: string) {
    setState((s) => mockExportProofPackage(s, packageId));
  }

  function handleRejectProofPlan(proofPlanId: string) {
    setState((s) => rejectProofPlan(s, proofPlanId));
  }

  function handleRejectProofPackage(packageId: string) {
    setState((s) => rejectProofPackage(s, packageId));
  }

  function handleCloseProof() {
    setState((s) => setProofPanelOpen(s, false));
  }

  return (
    <StudioShell>
      <StudioTopBar
        session={state.activeSession}
        recording={state.recording}
        onCycleAspect={cycleAspect}
        onToggleExport={toggleExport}
      />
      <div style={{ display: "flex", flex: 1 }}>
        <StudioToolRail activeTool={state.activeTool} onSetTool={handleSetTool} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
            <StudioPreview
              session={state.activeSession}
              selectedClip={selectedClip}
              isPlaying={state.isPlaying}
              recording={state.recording}
              selectedEditPlan={selectedEditPlan}
              selectedPublishPlan={selectedPublishPlan}
              selectedProofPlan={selectedProofPlan}
              onPlayPause={handlePlayPause}
            />
          </div>
          <div style={{ padding: 12 }}>
            <StudioClipStrip
              clips={state.activeSession.clips}
              selectedClipId={state.selectedClipId}
              latestCleanupPlan={latestCleanupPlan}
              deletionProtected={state.activeSession.proofStatus.deletionProtected}
              onSelect={handleSelectClip}
              onToggleDiscard={handleToggleDiscard}
            />
          </div>
          <div style={{ padding: "0 12px 12px 12px" }}>
            <StudioTimeline
              timeline={state.activeSession.timeline}
              selectedEditPlan={selectedEditPlan}
            />
          </div>
        </div>
        <StudioSessionPanel
          session={state.activeSession}
          selectedClip={selectedClip}
          recording={state.recording}
          editPlans={state.editPlans}
          selectedEditPlan={selectedEditPlan}
          cleanupPlans={state.cleanupPlans}
          selectedCleanupPlan={selectedCleanupPlan}
          publishPlans={state.publishPlans}
          selectedPublishPlan={selectedPublishPlan}
          proofPlans={state.proofPlans}
          selectedProofPlan={selectedProofPlan}
          proofArtifactCount={state.proofArtifacts.length}
          custodyEventCount={state.custodyEvents.length}
          onToggleDiscard={handleToggleDiscard}
        />
      </div>
      <StudioCommandPanel
        open={state.commandPanelOpen}
        session={state.activeSession}
        effectPreviews={state.effectPreviews}
        onSubmit={submitCommand}
      />
      <StudioExportPanel
        open={state.exportPanelOpen}
        session={state.activeSession}
        selectedExportTargets={state.selectedExportTargets}
        latestCleanupPlan={latestCleanupPlan}
        latestPublishPlan={latestPublishPlan}
        selectedProofPlan={selectedProofPlan}
        latestProofPackage={latestProofPackage}
        onClose={() => setState((s) => ({ ...s, exportPanelOpen: false }))}
      />
      <StudioAutoCutPanel
        open={state.autoCutPanelOpen}
        plans={state.editPlans}
        selectedPlanId={state.selectedEditPlanId}
        onSelectPlan={handleSelectPlan}
        onAcceptPlan={handleAcceptPlan}
        onRejectPlan={handleRejectPlan}
        onClose={handleCloseAutoCut}
      />
      <StudioCleanupPanel
        open={state.cleanupPreviewOpen}
        plans={state.cleanupPlans}
        selectedPlanId={state.selectedCleanupPlanId}
        onSelectPlan={handleSelectCleanupPlan}
        onConfirmPlan={handleConfirmCleanupPlan}
        onRejectPlan={handleRejectCleanupPlan}
        onClose={handleCloseCleanup}
      />
      <StudioPublishPanel
        open={state.publishPanelOpen}
        plans={state.publishPlans}
        selectedPlanId={state.selectedPublishPlanId}
        onSelectPlan={handleSelectPublishPlan}
        onMarkReady={handleMarkPublishPlanReady}
        onMockPublish={handleMockPublishPlan}
        onRejectPlan={handleRejectPublishPlan}
        onClose={handleClosePublish}
      />
      <StudioProofPanel
        open={state.proofPanelOpen}
        proofPlans={state.proofPlans}
        proofPackages={state.proofPackages}
        artifacts={state.proofArtifacts}
        custodyEvents={state.custodyEvents}
        selectedProofPlanId={state.selectedProofPlanId}
        selectedProofPackageId={state.selectedProofPackageId}
        onSelectProofPlan={handleSelectProofPlan}
        onGeneratePackage={handleGenerateProofPackage}
        onExportPackage={handleExportProofPackage}
        onRejectProofPlan={handleRejectProofPlan}
        onRejectPackage={handleRejectProofPackage}
        onClose={handleCloseProof}
      />
    </StudioShell>
  );
};

export default StudioScreen;
