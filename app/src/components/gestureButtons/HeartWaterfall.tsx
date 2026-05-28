import { useEffect, useState } from 'react'

type Particle = { id: number; drift: number; down: boolean }

type Props = {
  active: boolean
  direction?: 'up' | 'down' | null
}

export function HeartWaterfall({ active, direction = 'up' }: Props) {
  const [particles, setParticles] = useState<Particle[]>([])
  const down = direction === 'down'

  useEffect(() => {
    if (!active) {
      setParticles([])
      return
    }
    let id = 0
    const tick = () => {
      setParticles((prev) => {
        const next = [
          ...prev.slice(-18),
          { id: id++, drift: (Math.random() - 0.5) * 40, down },
        ]
        return next
      })
    }
    tick()
    const interval = setInterval(tick, 160)
    return () => clearInterval(interval)
  }, [active, down])

  if (!active) return null

  return (
    <div className="heart-waterfall" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className={`heart-waterfall__particle ${p.down ? 'heart-waterfall__particle--down' : ''}`}
          style={{ '--drift-x': `${p.drift}px` } as React.CSSProperties}
        >
          ♥
        </span>
      ))}
    </div>
  )
}
