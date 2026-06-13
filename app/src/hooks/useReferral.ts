import { useEffect, useState } from 'react'
import { fetchReferralStats } from '../services/referral.service'

export function useReferral() {
  const [code, setCode] = useState('…')
  const [invites, setInvites] = useState(0)
  const [earned, setEarned] = useState(0)

  useEffect(() => {
    void (async () => {
      const s = await fetchReferralStats()
      setCode(s.code)
      setInvites(s.invites)
      setEarned(s.earned)
    })()
  }, [])

  return { code, invites, earned }
}
