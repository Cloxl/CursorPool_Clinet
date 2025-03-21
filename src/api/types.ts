// 通用响应类型
export interface ApiResponse<T> {
  status: number
  msg: string
  data?: T
  code?: string
}

// 用户信息
export interface UserInfo {
  totalCount: number
  usedCount: number
  expireTime: string // 修改为字符串类型
  level: number
  isExpired: boolean
  username: string
  code_level?: string
}

// 账户信息
export interface AccountInfo {
  id: number
  account: string
  password: string
  token: string
  usage_count: number
  status: number
  create_time: string
  distributed_time: string
  update_time: string
}

// 账户池信息
export interface AccountPoolInfo {
  success: boolean
  account_info: AccountInfo
  activation_code: ActivationCode
}

// 激活码信息
export interface ActivationCode {
  id: number
  code: string
  type: number
  name: string
  level: number
  duration: number
  max_uses: number
  used_count: number
  status: number
  notes: string
  activated_at: string
  expired_at: string
}

// 登录请求
export interface LoginRequest {
  account: string
  password: string
  spread: string
}

// 注册响应
export interface RegisterResponse {
  token: string
  expires_time: number
}

// 登录响应
export interface LoginResponse {
  token?: string
  userInfo?: UserInfo
}

// 检查用户请求
export interface CheckUserRequest {
  email: string
}

// 发送验证码请求
export interface SendCodeRequest {
  email: string
  type: string // register或reset
}

// 注册请求
export interface RegisterRequest {
  email: string
  code: string
  password: string
  spread: string
}

// 重置密码请求
export interface ResetPasswordRequest {
  email: string
  code: string
  password: string
}

// 修改密码请求
export interface UpdatePasswordRequest {
  old_password: string
  new_password: string
  confirm_password: string
}

// 公告信息响应
export interface PublicInfo {
  type: string
  closeable: boolean
  props: PublicInfoProps
  actions: PublicInfoAction[]
}

export interface PublicInfoProps {
  title: string
  description: string
}

export interface PublicInfoAction {
  type: string
  text: string
  url: string
}

// GPT 模型使用情况
export interface GptModelUsage {
  numRequests: number
  numRequestsTotal: number
  numTokens: number
  maxRequestUsage?: number
  maxTokenUsage?: number
}

// 使用情况响应
export interface UsageInfo extends CursorUsageInfo {}

// Cursor 用户信息
export interface CursorUserInfo {
  email: string
  email_verified: boolean
  name: string
  sub: string
  updated_at: string
  picture: string | null
}

// Cursor 使用情况
export interface CursorUsageInfo {
  'gpt-4': CursorModelUsage
  'gpt-3.5-turbo': CursorModelUsage
  'gpt-4-32k': CursorModelUsage
  startOfMonth: string
}

// Cursor 模型使用情况
export interface CursorModelUsage {
  numRequests: number
  numRequestsTotal: number
  numTokens: number
  maxRequestUsage: number | null
  maxTokenUsage: number | null
}

// 机器码信息
export interface MachineInfo {
  machineId: string
  currentAccount: string
  cursorToken: string
  machineCode: string
}

// Bug报告请求
export interface BugReportRequest {
  severity: string
  bugDescription: string
  screenshotUrls?: string[]
  cursorVersion?: string
}

// 确保 CursorUserInfo 使用正确的属性名
export interface CursorUserInfo {
  email: string
  email_verified: boolean
  name: string
  sub: string
  updated_at: string // 确保使用下划线命名
  picture: string | null
}

// 历史记录条目
export interface HistoryRecord {
  id: number
  type_name: string
  detail: string
  timestamp: string
  operator: string
}

// 历史账户记录
export interface HistoryAccountRecord {
  email: string
  token: string
  machine_code: string
  gpt4_count: number
  gpt35_count: number
  last_used: number
  gpt4_max_usage?: number | null
  gpt35_max_usage?: number | null
}

// 公告数据结构
export interface Article {
  id: number
  title: string
  content: string
}

// 添加公告相关接口到现有ApiResponse类型
export interface ApiArticleResponse extends ApiResponse<Article[]> {}
