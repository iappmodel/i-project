import { useEffect, useRef, useState } from "react";

import { useRemote } from "./useRemote";
import type { RemoteAnchor, RemotePosition } from "./types";

const EDGE_PADDING = 12;
const DRAG_THRESHOLD_PX = 6;

const ORB_SIZE_BY_PREF = {
  small: 46,
  medium: 54,
  large: 64,
} as const;

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function inferAnchor(centerX: number, centerY: number): RemoteAnchor {
  if (centerX < 0.33 && centerY < 0.33) return "top-left";
  if (centerX > 0.66 && centerY < 0.33) return "top-right";
  if (centerX < 0.33 && centerY > 0.66) return "bottom-left";
  if (centerX > 0.66 && centerY > 0.66) return "bottom-right";
  return "custom";
}

function positionToPixels(
  position: RemotePosition,
  orbSize: number
): { left: number; top: number } {
  const width = typeof window === "undefined" ? 390 : window.innerWidth;
  const height = typeof window === "undefined" ? 844 : window.innerHeight;

  return {
    left: clamp(
      position.x * width - orbSize / 2,
      EDGE_PADDING,
      width - orbSize - EDGE_PADDING
    ),
    top: clamp(
      position.y * height - orbSize / 2,
      EDGE_PADDING,
      height - orbSize - EDGE_PADDING
    ),
  };
}

function pixelsToPosition(left: number, top: number, orbSize: number): RemotePosition {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const centerX = (left + orbSize / 2) / width;
  const centerY = (top + orbSize / 2) / height;

  return {
    x: Number(centerX.toFixed(4)),
    y: Number(centerY.toFixed(4)),
    anchor: inferAnchor(centerX, centerY),
  };
}

function formatModeLabel(mode: string): string {
  return mode.replace(/_/g, " ");
}

export function RemoteOrb() {
  const {
    remoteState,
    preferences,
    setRemotePosition,
    openRemote,
    closeRemote,
  } = useRemote();

  const orbSize = ORB_SIZE_BY_PREF[preferences.size];
  const isInteractive = remoteState.mode !== "disabled";

  const [pixelPosition, setPixelPosition] = useState(() =>
    positionToPixels(remoteState.position, ORB_SIZE_BY_PREF[preferences.size])
  );
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<{
    pointerId: number;
    originX: number;
    originY: number;
    startLeft: number;
    startTop: number;
    moved: boolean;
  } | null>(null);

  const lastPixelRef = useRef(pixelPosition);

  useEffect(() => {
    lastPixelRef.current = pixelPosition;
  }, [pixelPosition]);

  useEffect(() => {
    if (isDragging) return;
    setPixelPosition(
      positionToPixels(remoteState.position, ORB_SIZE_BY_PREF[preferences.size])
    );
  }, [remoteState.position.x, remoteState.position.y, preferences.size, isDragging]);

  useEffect(() => {
    function onResize() {
      if (isDragging) return;
      setPixelPosition(
        positionToPixels(remoteState.position, ORB_SIZE_BY_PREF[preferences.size])
      );
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [remoteState.position, preferences.size, isDragging]);

  function onActivate() {
    if (!isInteractive) return;
    if (remoteState.mode === "collapsed") {
      openRemote();
      return;
    }
    if (
      remoteState.mode === "quick" ||
      remoteState.mode === "expanded" ||
      remoteState.mode === "command_center" ||
      remoteState.mode === "settings"
    ) {
      closeRemote();
      return;
    }
    if (remoteState.mode === "locked") {
      return;
    }
    openRemote();
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (remoteState.mode === "disabled") return;
    if (event.button !== 0) return;

    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startLeft: lastPixelRef.current.left,
      startTop: lastPixelRef.current.top,
      moved: false,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    const dx = event.clientX - drag.originX;
    const dy = event.clientY - drag.originY;

    if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
      drag.moved = true;
      setIsDragging(true);
    }

    if (!drag.moved) return;

    const size = ORB_SIZE_BY_PREF[preferences.size];
    const nextLeft = clamp(
      drag.startLeft + dx,
      EDGE_PADDING,
      window.innerWidth - size - EDGE_PADDING
    );
    const nextTop = clamp(
      drag.startTop + dy,
      EDGE_PADDING,
      window.innerHeight - size - EDGE_PADDING
    );

    const next = { left: nextLeft, top: nextTop };
    lastPixelRef.current = next;
    setPixelPosition(next);
  }

  function endPointerInteraction(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore if capture already released
    }

    dragRef.current = null;
    setIsDragging(false);

    if (!drag.moved) {
      onActivate();
      return;
    }

    const size = ORB_SIZE_BY_PREF[preferences.size];
    const { left, top } = lastPixelRef.current;
    setRemotePosition(pixelsToPosition(left, top, size));
  }

  return (
    <button
      type="button"
      className={[
        "i-remote-orb",
        `i-remote-orb--${remoteState.visualState}`,
        preferences.size === "small" ? "small" : "",
        preferences.size === "large" ? "large" : "",
        remoteState.isLocked ? "locked" : "",
        isDragging ? "dragging" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: pixelPosition.left,
        top: pixelPosition.top,
        opacity: preferences.opacity,
      }}
      aria-label={remoteState.mode === "collapsed" ? "Open iRemote" : "Close iRemote"}
      disabled={!isInteractive}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointerInteraction}
      onPointerCancel={endPointerInteraction}
    >
      <span className="i-remote-orb__ring" aria-hidden />
      <span className="i-remote-orb__core" aria-hidden>
        i
      </span>
      <span className="i-remote-orb__state">{formatModeLabel(remoteState.mode)}</span>
    </button>
  );
}
