export function PlaceholderToolPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="ist-scroll">
      <h3 className="ist-panel__title">{title}</h3>
      <p style={{ fontSize: 12, color: "var(--ist-muted)", lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}
