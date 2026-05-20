type Props = {
  paths: string[]
}

export function SourceEvidence({ paths }: Props) {
  return (
    <footer className="source-evidence">
      <p className="source-evidence__label">Source evidence</p>
      <ul className="source-evidence__list">
        {paths.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </footer>
  )
}
