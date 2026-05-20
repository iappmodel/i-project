export const studioCopy = {
  title: "[ i ] Studio",
  placeholders: { commandInput: "Try: i-make this video 45 seconds" },
  badges: { aiReady: "AI-ready", proofPending: "Proof pending", target: (s: number) => `${s}s target` },
  export: { generatePreview: "Generate preview export", saveDraft: "Save draft", preparePublish: "Prepare publish" },
};

export function formatRecordingElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
