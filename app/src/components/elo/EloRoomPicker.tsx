import { PRESENCE_ROOMS } from '../../lib/elo/rooms'
import type { PresenceRoomId } from '../../lib/elo/types'
import { useElo } from '../../state/eloContext'

export function EloRoomPicker() {
  const { config, setRoom } = useElo()

  return (
    <section>
      <p className="elo-section-title">Presence room</p>
      <div className="elo-chip-row">
        {PRESENCE_ROOMS.map((room) => (
          <button
            key={room.id}
            type="button"
            className={`elo-chip ${config.roomId === room.id ? 'elo-chip--active' : ''}`}
            onClick={() => setRoom(room.id as PresenceRoomId)}
            title={room.description}
          >
            {room.label}
          </button>
        ))}
      </div>
    </section>
  )
}
