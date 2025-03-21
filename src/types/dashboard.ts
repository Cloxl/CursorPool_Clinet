export interface PendingForceKillAction {
  type: 'account' | 'machine' | 'quick' | 'hook'
  params?: any
}
