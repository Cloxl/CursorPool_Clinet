import type { HistoryAccount } from '@/types/history'
import {
  getHistoryAccounts as apiGetHistoryAccounts,
  removeHistoryAccount as apiRemoveHistoryAccount,
} from '@/api'
import type { HistoryAccountRecord } from '@/api/types'

const STORAGE_KEY = 'history_accounts'

/**
 * 将后端HistoryAccountRecord转换为前端HistoryAccount
 */
function convertToFrontendAccount(account: HistoryAccountRecord): HistoryAccount {
  // 使用类型断言来安全访问字段
  const anyAccount = account as any

  return {
    email: account.email,
    token: account.token,
    machineCode: account.machine_code || anyAccount.machineCode || '',
    gpt4Count: account.gpt4_count || anyAccount.gpt4Count || 0,
    gpt35Count: account.gpt35_count || anyAccount.gpt35Count || 0,
    gpt4MaxUsage:
      account.gpt4_max_usage != null
        ? account.gpt4_max_usage
        : anyAccount.gpt4MaxUsage != null
          ? anyAccount.gpt4MaxUsage
          : 150,
    gpt35MaxUsage:
      account.gpt35_max_usage != null
        ? account.gpt35_max_usage
        : anyAccount.gpt35MaxUsage != null
          ? anyAccount.gpt35MaxUsage
          : 500,
    lastUsed: account.last_used || anyAccount.lastUsed || Date.now(),
  }
}

/**
 * 获取历史账户列表
 */
export async function getHistoryAccounts(): Promise<HistoryAccount[]> {
  try {
    // 从后端获取
    const accounts = await apiGetHistoryAccounts()
    return accounts.map(convertToFrontendAccount)
  } catch (error) {
    console.error('从后端获取历史账户失败，回退到本地存储:', error)

    // 如果后端获取失败，回退到本地存储
    return getHistoryAccountsFromLocal()
  }
}

/**
 * 从本地存储获取历史账户
 */
function getHistoryAccountsFromLocal(): HistoryAccount[] {
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

/**
 * 删除历史账户
 */
export async function removeHistoryAccount(email: string) {
  try {
    // 从后端删除
    await apiRemoveHistoryAccount(email)
  } catch (error) {
    console.error('从后端删除历史账户失败，回退到本地存储:', error)

    // 如果后端删除失败，回退到本地存储
    const history = getHistoryAccountsFromLocal()
    const filtered = history.filter((a) => a.email !== email)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  }
}

/**
 * 同步本地历史账户到后端
 */
export async function syncLocalAccountsToBackend() {
  const localAccounts = localStorage.getItem(STORAGE_KEY)

  if (!localAccounts) {
    return // 没有本地历史账户，不需要同步
  }

  try {
    const accounts: HistoryAccount[] = JSON.parse(localAccounts)

    if (accounts.length === 0) {
      // 空记录，直接清除本地存储
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    console.log(`本地发现${accounts.length}个历史账户，新版本由后端自动管理，不再需要前端同步`)

    // 不再需要主动同步到后端，历史记录会在账户切换时由后端自动保存
    // 清除本地存储，避免冗余
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('处理本地历史账户失败:', error)
    localStorage.removeItem(STORAGE_KEY)
  }
}
