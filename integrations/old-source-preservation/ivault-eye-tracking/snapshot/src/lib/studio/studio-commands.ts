import type { StudioCommand, CommandIntent, StudioEffectPreview } from "./studio.types";

const gid = (p = "cmd-") => `${p}${Math.floor(Math.random() * 1e9).toString(36)}`;
const nowISO = () => new Date().toISOString();
const normalize = (s: string) => s.trim().toLowerCase();

function detectIntent(n: string): CommandIntent {
  if (/\b(go|start recording|pause|resume|stop|mark)\b/.test(n)) return "capture_control";
  if (/(seconds|sec|minute|min|rough cut|cut|remove|trim)/.test(n)) return "edit_request";
  if (/(skin|lighting|cinematic|beauty)/.test(n)) return "enhancement_request";
  if (/(music|audio|voice|sound)/.test(n)) return "audio_request";
  if (/(post|publish|feed|stories)/.test(n)) return "publish_request";
  if (/(delete|cleanup|storage)/.test(n)) return "storage_request";
  if (/(proof|originality|fingerprint)/.test(n)) return "proof_request";
  return "unknown";
}

function previewForIntent(intent: CommandIntent): string {
  switch (intent) {
    case "capture_control":     return "Capture command queued.";
    case "edit_request":        return "Studio will create a rough cut using marks and highlight scores.";
    case "enhancement_request": return "Studio will prepare a non-destructive visual enhancement layer.";
    case "audio_request":       return "Studio will analyze audio and propose fixes.";
    case "publish_request":     return "Studio will prepare publishing targets (feed/stories).";
    case "storage_request":     return "Studio found recoverable raw media; deletion requires confirmation.";
    case "proof_request":       return "Studio will prepare originality fingerprinting and custody metadata.";
    default:                    return "Unable to parse intent.";
  }
}

export function parseStudioCommand(raw: string): StudioCommand {
  const n = normalize(raw);
  const intent = detectIntent(n);
  return { id: gid(), raw, normalized: n, intent, status: "previewed", createdAt: nowISO(), previewText: previewForIntent(intent) };
}

export function extractTargetDurationSeconds(raw: string): number | null {
  const n = normalize(raw);
  const minMatch = n.match(/(\d+)\s*(minute|minutes|min)\b/);
  if (minMatch) {
    const mins = Number(minMatch[1]);
    if (!Number.isNaN(mins)) return mins * 60;
  }
  const secMatch = n.match(/(\d+)\s*(second|seconds|sec|s)\b/);
  if (secMatch) {
    const secs = Number(secMatch[1]);
    if (!Number.isNaN(secs)) return secs;
  }
  const mmss = n.match(/\b(\d+):(\d{2})\b/);
  if (mmss) {
    const mm = Number(mmss[1]);
    const ss = Number(mmss[2]);
    if (!Number.isNaN(mm) && !Number.isNaN(ss)) return mm * 60 + ss;
  }
  return null;
}

export function createEffectPreviewFromCommand(raw: string): StudioEffectPreview | null {
  const n = normalize(raw);
  const now = nowISO();
  if (/(music|background sound|audio|sound)/.test(n)) {
    return { id: gid("ef-"), type: "audio", label: "Background audio", description: `Mock audio added: ${raw}`, createdAt: now };
  }
  if (/(skin|lighting|cinematic|beauty)/.test(n)) {
    return { id: gid("ef-"), type: "visual", label: "Visual enhancement", description: `Non-destructive visual enhancement: ${raw}`, createdAt: now };
  }
  if (/(transition|fade|wipe)/.test(n)) {
    return { id: gid("ef-"), type: "transition", label: "Transition", description: `Mock transition: ${raw}`, createdAt: now };
  }
  if (/(caption|subtitle)/.test(n)) {
    return { id: gid("ef-"), type: "caption", label: "Caption", description: `Mock caption layer: ${raw}`, createdAt: now };
  }
  if (/(publish|post)/.test(n)) {
    return { id: gid("ef-"), type: "publish", label: "Publish preview", description: `Publish targets prepared: ${raw}`, createdAt: now };
  }
  if (/(cleanup|delete unused|cleanup storage)/.test(n)) {
    return { id: gid("ef-"), type: "cleanup", label: "Cleanup preview", description: `Storage cleanup preview: ${raw}`, createdAt: now };
  }
  return null;
}
