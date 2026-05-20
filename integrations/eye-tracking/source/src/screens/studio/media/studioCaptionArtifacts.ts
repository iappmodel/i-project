/** Stage 10 — versioned caption artifacts (VTT/SRT/JSON). Captions must be versioned artifacts. */

export type CaptionFormat = 'vtt' | 'srt' | 'json' | 'burned_in';

export interface CaptionCue {
  id: string;
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

export interface CaptionArtifact {
  id: string;
  projectId: string;
  assetId?: string;
  language: string;
  format: CaptionFormat;
  cues: CaptionCue[];
  storagePath?: string;
  status: 'draft' | 'ready' | 'failed';
}

export interface StudioSubtitleTrack {
  id: string;
  language: string;
  cues: CaptionCue[];
}

export interface StudioProjectSubtitles {
  tracks: StudioSubtitleTrack[];
}

export function buildCaptionJson(cues: CaptionCue[]): string {
  return JSON.stringify({ version: 1, cues }, null, 2);
}

export function buildMockVtt(cues: CaptionCue[]): string {
  const lines = ['WEBVTT', ''];
  for (const c of cues) {
    const start = formatVttTime(c.startMs);
    const end = formatVttTime(c.endMs);
    lines.push(`${start} --> ${end}`, c.text, '');
  }
  return lines.join('\n');
}

function formatVttTime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const msRem = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)}.${String(msRem).padStart(3, '0')}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function validateCaptionCues(cues: CaptionCue[]): string[] {
  const errors: string[] = [];
  cues.forEach((c, i) => {
    if (c.endMs < c.startMs) errors.push(`Cue ${i}: end before start.`);
    if (!c.text.trim()) errors.push(`Cue ${i}: empty text.`);
  });
  return errors;
}

export function createCaptionArtifactFromStudioSubtitles(
  projectId: string,
  subtitles: StudioProjectSubtitles | undefined,
): CaptionArtifact | null {
  const first = subtitles?.tracks[0];
  if (!first) return null;
  return {
    id: `cap_${Date.now()}`,
    projectId,
    language: first.language,
    format: 'json',
    cues: first.cues,
    status: 'ready',
  };
}
