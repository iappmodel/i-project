import { getSupabaseClient } from '@/lib/supabaseClient'
import type { VisionCalibrationProfile } from '@/lib/visionCalibration/profile'

export async function fetchProfileCalibration(
  _userId: string,
  _deviceId?: string | null,
): Promise<VisionCalibrationProfile | null> {
  if (!getSupabaseClient()) return null
  return null
}

export async function saveProfileCalibration(
  _userId: string,
  _data: VisionCalibrationProfile,
  _deviceId?: string | null,
): Promise<void> {
  // Loop 1 bridge: profile sync deferred until Supabase calibration columns are promoted.
}
