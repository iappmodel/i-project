import { useRef, useState } from "react";
import type { StudioAssetType } from "../studioTypes";
import type { StudioController } from "../studioStore";

export function StudioUploadDropzone({ studio }: { studio: StudioController }) {
  const { actions } = studio;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const ingest = (name: string, type: StudioAssetType) => {
    const asset = actions.createMockUploadedAsset(name, type);
    actions.mockUploadAsset(asset);
  };

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const f = files[0]!;
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    let type: StudioAssetType = "video";
    if (["mp3", "aac", "wav", "m4a"].includes(ext)) type = "audio";
    if (["jpg", "jpeg", "png", "webp"].includes(ext)) type = "image";
    ingest(f.name, type);
  };

  return (
    <div
      className="ist-panel"
      style={{
        maxWidth: 420,
        margin: "0 auto",
        textAlign: "center",
        borderStyle: dragging ? "solid" : undefined,
        borderColor: dragging ? "rgba(94, 234, 212, 0.45)" : undefined,
        background: dragging ? "rgba(94, 234, 212, 0.06)" : undefined,
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(e.dataTransfer.files);
      }}
    >
      <div style={{ fontSize: 42, lineHeight: 1, marginBottom: 8 }}>⬆</div>
      <h2 className="ist-panel__title" style={{ textAlign: "center" }}>
        Drop media here
      </h2>
      <p className="ist-mono" style={{ fontSize: 11, color: "var(--ist-muted)", margin: "0 0 12px" }}>
        Upload video, image, or audio
      </p>
      <p style={{ fontSize: 11, color: "var(--ist-muted)", marginBottom: 16 }}>
        Supported: MP4, MOV, AAC, MP3, JPG, PNG (mock ingest — no real processing).
      </p>
      <input ref={inputRef} type="file" accept="video/*,audio/*,image/*" hidden onChange={(e) => onFiles(e.target.files)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button type="button" className="ist-btn ist-btn--primary" onClick={() => inputRef.current?.click()}>
          Upload from device
        </button>
        <button type="button" className="ist-btn" onClick={() => ingest("import_social_clip.mp4", "video")}>
          Import from social
        </button>
        <button type="button" className="ist-btn ist-btn--ghost" disabled title="Stage 2">
          Paste URL
        </button>
      </div>
    </div>
  );
}
