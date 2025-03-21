import { invoke } from '@tauri-apps/api/core'
import type {
  ApiResponse,
  LoginResponse,
  UserInfo,
  AccountPoolInfo,
  UsageInfo,
  PublicInfo,
  MachineInfo,
  HistoryRecord,
  HistoryAccountRecord,
  Article,
  RegisterResponse,
} from './types'
import Logger from '../utils/logger'

// 错误处理
function handleApiResponse<T>(response: ApiResponse<T>): T {
  if (response.status === 200) {
    // 成功时返回 data
    if (response.data) {
      return response.data
    }
    // 如果没有data，返回空对象
    return {} as T
  }

  // 状态码不为200时抛出错误，优先使用服务器返回的消息
  throw new ApiError(response.msg || '链接服务器失败，请稍后再试')
}

// API 错误类
export class ApiError extends Error {
  public statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
  }
}

// 用户认证相关 API
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkUser(email: string): Promise<ApiResponse<any>> {
  try {
    const response = await invoke<ApiResponse<any>>('check_user', { email })
    return response
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '检查用户失败')
  }
}

export async function sendCode(email: string, type: string): Promise<void> {
  try {
    const response = await invoke<ApiResponse<void>>('send_code', {
      email,
      type,
    })
    handleApiResponse(response)
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '发送验证码失败')
  }
}

export async function register(
  email: string,
  code: string,
  password: string,
  spread: string,
): Promise<LoginResponse> {
  try {
    const response = await invoke<ApiResponse<RegisterResponse>>('register', {
      email,
      code,
      password,
      spread,
    })
    if (response.status === 200 && response.data?.token) {
      // 保存token
      try {
        await saveUserApiToken(response.data.token)
      } catch (saveError) {
        console.error('保存token失败:', saveError)
        // 注意：即使保存token失败，我们仍然继续流程
      }

      // 将RegisterResponse转换为LoginResponse格式
      return {
        token: response.data.token,
        // userInfo在这里不可用，需要额外获取
      }
    }
    return handleApiResponse(response)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '注册失败'
    if (errorMsg.includes('invalid type: map, expected unit')) {
      console.warn('注册API返回格式错误，但注册可能已成功，尝试继续流程')
      return {} as LoginResponse
    }
    throw new ApiError(errorMsg)
  }
}

export async function login(
  account: string,
  password: string,
  spread: string,
): Promise<LoginResponse> {
  try {
    const response = await invoke<ApiResponse<LoginResponse>>('login', {
      account,
      password,
      spread,
    })
    return handleApiResponse(response)
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '登录失败')
  }
}

// 用户信息相关 API
export async function getUserInfo(): Promise<UserInfo> {
  try {
    const response = await invoke<ApiResponse<UserInfo>>('get_user_info')

    if (response.status !== 200) {
      throw new ApiError(response.msg || '链接服务器失败')
    }

    return handleApiResponse(response)
  } catch (error) {
    // 如果已经是ApiError类型，直接抛出
    if (error instanceof ApiError) {
      throw error
    }
    // 否则包装成ApiError
    throw new ApiError(error instanceof Error ? error.message : '链接服务器失败')
  }
}

export async function getAccount(account?: string, usageCount?: string): Promise<AccountPoolInfo> {
  try {
    const response = await invoke<ApiResponse<AccountPoolInfo>>('get_account', {
      account,
      usageCount,
    })
    return handleApiResponse(response)
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '获取账户信息失败')
  }
}

// Cursor 平台相关 API
export async function getUsage(token: string): Promise<UsageInfo> {
  try {
    const response = await invoke<ApiResponse<UsageInfo>>('get_usage', {
      token,
    })
    return handleApiResponse(response)
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '获取使用情况失败')
  }
}

// 系统信息相关 API
export async function getPublicInfo(): Promise<PublicInfo> {
  try {
    const response = await invoke<ApiResponse<PublicInfo>>('get_public_info')
    return handleApiResponse(response)
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '获取公共信息失败')
  }
}

// 账户管理相关 API
export async function activate(code: string): Promise<void> {
  try {
    const response = await invoke<ApiResponse<void>>('activate', { code })
    handleApiResponse(response)
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '激活失败')
  }
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  try {
    const response = await invoke<ApiResponse<void>>('change_password', {
      oldPassword,
      newPassword,
    })
    handleApiResponse(response)
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '修改密码失败')
  }
}

// 机器码和账户切换相关 API
export async function resetMachineId(
  params: {
    forceKill?: boolean
    machineId?: string
  } = {},
): Promise<boolean> {
  try {
    return await invoke<boolean>('reset_machine_id', {
      forceKill: params.forceKill || false,
      machineId: params.machineId,
    })
  } catch (error) {
    await Logger.error('重置机器码失败', { file: 'api/index.ts' })
    throw new ApiError(error instanceof Error ? error.message : '重置机器码失败')
  }
}

export async function switchAccount(
  email: string,
  token: string,
  forceKill: boolean = false,
): Promise<void> {
  try {
    const result = await invoke<boolean>('switch_account', {
      email,
      token,
      forceKill,
    })
    if (result !== true) {
      await Logger.error(`切换账户失败: ${email}`, { file: 'api/index.ts' })
      throw new Error('切换账户失败')
    }
  } catch (error) {
    await Logger.error(`切换账户失败: ${email}, ${error}`, {
      file: 'api/index.ts',
    })
    const errorMsg = error instanceof Error ? error.message : '切换账户失败'
    if (errorMsg.includes('Cursor进程正在运行')) {
      throw new Error('请先关闭 Cursor 或选择强制终止进程')
    }
    throw error
  }
}

export async function getMachineIds(): Promise<MachineInfo> {
  try {
    return await invoke<MachineInfo>('get_machine_ids')
  } catch (error) {
    await Logger.error('获取机器码失败', { file: 'api/index.ts' })
    throw new ApiError(error instanceof Error ? error.message : '获取机器码失败')
  }
}

export async function checkCursorRunning(): Promise<boolean> {
  try {
    return await invoke<boolean>('check_cursor_running')
  } catch (error) {
    await Logger.error('检查Cursor状态失败', { file: 'api/index.ts' })
    throw new ApiError(error instanceof Error ? error.message : '检查Cursor状态失败')
  }
}

// 管理员权限相关 API
export async function checkAdminPrivileges(): Promise<boolean> {
  try {
    return await invoke<boolean>('check_admin_privileges')
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '检查管理员权限失败')
  }
}

// Hook 相关 API
export async function checkHookStatus(): Promise<boolean> {
  try {
    return await invoke<boolean>('is_hook', {})
  } catch (error) {
    console.error('检查hook状态错误:', error)
    throw error
  }
}

export async function applyHook(forceKill: boolean = false): Promise<void> {
  try {
    await invoke<void>('hook_main_js', {
      forceKill,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await Logger.error(`应用hook失败: ${errorMsg}`, { file: 'api/index.ts' })

    if (errorMsg.includes('Cursor进程正在运行')) {
      throw new Error('请先关闭 Cursor 或选择强制终止进程')
    }

    throw error
  }
}

export async function findCursorPath(selectedPath: string): Promise<boolean> {
  try {
    return await invoke<boolean>('find_cursor_path', { selectedPath })
  } catch (error) {
    console.error('查找Cursor路径错误:', error)
    throw error
  }
}

export async function restoreHook(forceKill: boolean = false): Promise<void> {
  try {
    await invoke<void>('restore_hook', {
      forceKill,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await Logger.error(`恢复hook失败: ${errorMsg}`, { file: 'api/index.ts' })

    if (errorMsg.includes('Cursor进程正在运行')) {
      throw new Error('请先关闭 Cursor 或选择强制终止进程')
    }

    throw error
  }
}

export async function resetPassword(email: string, code: string, password: string): Promise<void> {
  try {
    const response = await invoke<ApiResponse<void>>('reset_password', {
      email,
      code,
      password,
    })
    handleApiResponse(response)
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '重置密码失败')
  }
}

// 添加新的 API 函数来检测系统是否为 Windows
export async function checkIsWindows(): Promise<boolean> {
  try {
    return await invoke<boolean>('check_is_windows')
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '检查系统是否为Windows失败')
  }
}

// 添加关闭和启动Cursor的API
export async function closeCursor(): Promise<boolean> {
  return await invoke('close_cursor')
}

export async function launchCursor(): Promise<boolean> {
  return await invoke('launch_cursor')
}

// 登出
export async function logout(): Promise<void> {
  try {
    const response = await invoke<ApiResponse<void>>('logout')
    handleApiResponse(response)
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '登出失败')
  }
}

// 使用键值存储实现历史记录功能

/**
 * 保存历史记录
 * @param record 历史记录
 */
export async function saveHistoryRecord(record: HistoryRecord): Promise<void> {
  try {
    // 先获取现有记录
    const records = await getHistoryRecords()

    // 添加新记录
    records.push(record)

    // 保存回数据库
    await setUserData('user.history', JSON.stringify(records))
  } catch (error) {
    console.error('保存历史记录失败:', error)
    throw new ApiError(error instanceof Error ? error.message : '保存历史记录失败')
  }
}

/**
 * 批量保存历史记录
 * @param records 历史记录数组
 */
export async function saveHistoryRecords(records: HistoryRecord[]): Promise<void> {
  try {
    // 先获取现有记录
    let existingRecords = await getHistoryRecords()

    // 合并记录
    existingRecords = [...existingRecords, ...records]

    // 保存回数据库
    await setUserData('user.history', JSON.stringify(existingRecords))
  } catch (error) {
    console.error('批量保存历史记录失败:', error)
    throw new ApiError(error instanceof Error ? error.message : '保存历史记录失败')
  }
}

/**
 * 获取所有历史记录
 * @returns 历史记录数组
 */
export async function getHistoryRecords(): Promise<HistoryRecord[]> {
  try {
    const data = await getUserData('user.history')
    if (!data) {
      return []
    }

    try {
      return JSON.parse(data) as HistoryRecord[]
    } catch (e) {
      console.error('历史记录解析失败:', e)
      return []
    }
  } catch (error) {
    console.error('获取历史记录失败:', error)
    throw new ApiError(error instanceof Error ? error.message : '获取历史记录失败')
  }
}

/**
 * 清除所有历史记录
 */
export async function clearHistoryRecords(): Promise<void> {
  try {
    await delUserData('user.history')
  } catch (error) {
    console.error('清除历史记录失败:', error)
    throw new ApiError(error instanceof Error ? error.message : '清除历史记录失败')
  }
}

/**
 * 获取历史账户列表
 */
export async function getHistoryAccounts(): Promise<HistoryAccountRecord[]> {
  try {
    const data = await getUserData('user.history.accounts')
    if (!data) {
      return []
    }

    try {
      return JSON.parse(data) as HistoryAccountRecord[]
    } catch (e) {
      console.error('历史账户解析失败:', e)
      return []
    }
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '获取历史账户失败')
  }
}

/**
 * 删除历史账户
 * @param email 要删除的账户邮箱
 */
export async function removeHistoryAccount(email: string): Promise<void> {
  try {
    // 先获取现有账户
    let accounts = await getHistoryAccounts()

    // 过滤掉要删除的账户
    accounts = accounts.filter((a) => a.email !== email)

    // 保存回数据库
    await setUserData('user.history.accounts', JSON.stringify(accounts))
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '删除历史账户失败')
  }
}

/**
 * 清除所有历史账户
 */
export async function clearHistoryAccounts(): Promise<void> {
  try {
    await delUserData('user.history.accounts')
  } catch (error) {
    console.error('清除历史账户失败:', error)
    throw new ApiError(error instanceof Error ? error.message : '清除历史账户失败')
  }
}

/**
 * 保存用户API Token
 * @param token API Token
 */
export async function saveUserApiToken(token: string): Promise<void> {
  try {
    await setUserData('user.info.token', token)
  } catch (error) {
    console.error('保存API Token失败:', error)
    throw new ApiError(error instanceof Error ? error.message : '保存API Token失败')
  }
}

/**
 * 获取用户API Token
 * @returns API Token，如果不存在则返回null
 */
export async function getUserApiToken(): Promise<string | null> {
  try {
    return await getUserData('user.info.token')
  } catch (error) {
    console.error('获取API Token失败:', error)
    throw new ApiError(error instanceof Error ? error.message : '获取API Token失败')
  }
}

/**
 * 清除用户API Token
 */
export async function clearUserApiToken(): Promise<void> {
  try {
    await delUserData('user.info.token')
  } catch (error) {
    console.error('清除API Token失败:', error)
    throw new ApiError(error instanceof Error ? error.message : '清除API Token失败')
  }
}

// 添加通用的键值存储 API 方法

/**
 * 设置用户数据
 * @param key 键名
 * @param value 值
 */
export async function setUserData(key: string, value: string): Promise<void> {
  try {
    await invoke<ApiResponse<any>>('set_user_data', { key, value })
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '设置用户数据失败')
  }
}

/**
 * 获取用户数据
 * @param key 键名
 * @returns 获取的值，如果不存在则返回 null
 */
export async function getUserData(key: string): Promise<string | null> {
  try {
    const response = await invoke<
      ApiResponse<{
        value: string | null
      }>
    >('get_user_data', { key })
    const result = handleApiResponse(response)
    return result.value
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '获取用户数据失败')
  }
}

/**
 * 删除用户数据
 * @param key 键名
 */
export async function delUserData(key: string): Promise<void> {
  try {
    await invoke<ApiResponse<any>>('del_user_data', { key })
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : '删除用户数据失败')
  }
}

// 使用通用 API 实现的特定功能

/**
 * 检查用户是否已接受免责声明
 * @returns 是否已接受
 */
export async function checkDisclaimerAccepted(): Promise<boolean> {
  try {
    const value = await getUserData('user.disclaimer.accepted')
    return value === 'true'
  } catch (error) {
    console.error('检查免责声明失败:', error)
    return false
  }
}

/**
 * 设置用户已接受免责声明
 */
export async function setDisclaimerAccepted(): Promise<void> {
  try {
    await setUserData('user.disclaimer.accepted', 'true')
  } catch (error) {
    console.error('设置免责声明状态失败:', error)
    throw error
  }
}

/**
 * 清除用户的免责声明接受状态
 */
export async function clearDisclaimerAccepted(): Promise<void> {
  try {
    await delUserData('user.disclaimer.accepted')
  } catch (error) {
    console.error('清除免责声明状态失败:', error)
    throw error
  }
}

// 获取公告列表
export async function getArticleList(): Promise<Article[]> {
  try {
    const response = await invoke<ApiResponse<Article[]>>('get_article_list')
    return handleApiResponse(response)
  } catch (error) {
    // 静默处理错误，返回空数组
    console.error('Failed to get article list:', error)
    return []
  }
}

// 检查文章是否已读
export async function isArticleRead(articleId: number): Promise<boolean> {
  try {
    const valueStr = await getUserData('system.articles')
    if (!valueStr) return false

    try {
      // 尝试正确解析JSON
      const readIds = JSON.parse(valueStr) as number[]

      // 确保它是一个数组
      if (Array.isArray(readIds)) {
        const result = readIds.includes(articleId)
        return result
      } else {
        console.error('已读文章ID不是一个数组:', readIds)
        return false
      }
    } catch (parseError) {
      console.error('解析已读文章ID失败:', parseError, '原始数据:', valueStr)
      return false
    }
  } catch (error) {
    console.error('获取已读文章状态失败:', error)
    return false
  }
}

// 标记文章为已读
export async function markArticleRead(articleId: number): Promise<void> {
  try {
    await invoke<ApiResponse<void>>('mark_article_read', { articleId })
  } catch (error) {
    // 静默处理错误
    console.error('Failed to mark article as read:', error)
  }
}
