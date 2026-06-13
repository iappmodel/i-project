import { useCallback, useEffect, useState } from 'react'
import type { CheckInState } from '../lib/demoCheckInStore'
import {
  fetchCheckInStreak,
  verifyCheckIn,
  type VerifyCheckInResult,
} from '../services/checkin.service'

export function useCheckInStatus() {
  const [state, setState] = useState<CheckInState>({ streakDays: 0, longestStreak: 0, lastCheckInAt: null })
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setState(await fetchCheckInStreak())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const checkIn = useCallback(
    async (promotionId?: string | null): Promise<VerifyCheckInResult> => {
      setChecking(true)
      try {
        const result = await verifyCheckIn({
          promotionId,
          userLat: -33.9249,
          userLng: 18.4241,
        })
        if (result.success) await reload()
        return result
      } finally {
        setChecking(false)
      }
    },
    [reload],
  )

  return { ...state, loading, checking, reload, checkIn }
}
