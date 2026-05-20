import { describe, expect, it, vi } from "vitest";
import {
  emitRemoteClosed,
  emitRemoteCommandEvent,
  emitRemoteOpened,
  subscribeToRemoteEvents,
} from "./remoteEvents";
import type { RemoteCommand } from "./types";

describe("remoteEvents", () => {
  it("assigns id and createdAt after spread so they are never overridden", () => {
    const e = emitRemoteOpened("feed", "expanded");
    expect(e.type).toBe("remote.opened");
    expect(e.surface).toBe("feed");
    expect(e.mode).toBe("expanded");
    expect(e.id.length).toBeGreaterThan(0);
    expect(e.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("notifies subscribers", () => {
    const fn = vi.fn();
    const unsub = subscribeToRemoteEvents(fn);
    emitRemoteClosed("wallet");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0].type).toBe("remote.closed");
    unsub();
    emitRemoteClosed("wallet");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("maps command status to event type", () => {
    const command: RemoteCommand = {
      id: "c1",
      type: "GO_HOME",
      label: "Home",
      surface: "feed",
      riskLevel: "LOW",
      inputSource: "touch",
    };
    const ev = emitRemoteCommandEvent({ command, status: "rate_limited" });
    expect(ev.type).toBe("remote.command.rate_limited");
    expect(ev.commandId).toBe("c1");
  });
});
