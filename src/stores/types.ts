// 历史记录类型
export interface HistoryRecord {
  id: string
  type: string
  detail: string
  time: number
  operator?: string
}

// 历史账户类型
export interface HistoryAccount {
  email: string
  token: string
  machineCode: string
  gpt4Count: number
  gpt35Count: number
  lastUsed: number
  gpt4MaxUsage?: number | null
  gpt35MaxUsage?: number | null
}
