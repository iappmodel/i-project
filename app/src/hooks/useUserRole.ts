/** Presenter/product app has no admin RBAC yet — archive checkout admin panels stay hidden. */
export function useUserRole() {
  return {
    canAccessAdmin: false,
    role: 'user' as const,
  }
}
