import { mockPermissions } from '../mockData'
import type { EloPermission, EloPermissionKey } from '../types'

export function getEloPermissions(): EloPermission[] {
  return [...mockPermissions]
}

export function setEloPermission(key: EloPermissionKey, granted: boolean): EloPermission[] {
  const permission = mockPermissions.find((item) => item.key === key)
  if (permission) permission.granted = granted
  return [...mockPermissions]
}

export function hasEloPermission(key: EloPermissionKey): boolean {
  return mockPermissions.some((item) => item.key === key && item.granted)
}
