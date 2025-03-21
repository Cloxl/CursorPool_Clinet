import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { HistoryAccount } from './types'
import type { HistoryRecords } from '../types/history'
import { getHistoryList, syncLocalHistoryToBackend } from '../utils/history'
import {
  getHistoryAccounts,
  removeHistoryAccount,
  syncLocalAccountsToBackend,
} from '../utils/historyAccounts'
import { getUsage, getMachineIds } from '@/api'

export const useHistoryStore = defineStore('history', () => {
  // 状态
  const records = ref<HistoryRecords>([])
  const isLoading = ref(false)
  const error = ref('')

  // 历史账户界面相关状态
  const accounts = ref<HistoryAccount[]>([])
  const currentAccountEmail = ref('')
  const loadingAccounts = ref(false)
  const switchingAccount = ref<Record<string, boolean>>({})
  const deletingAccount = ref<Record<string, boolean>>({})
  const clearingHighUsage = ref(false)
  const initialized = ref(false)

  // Getters
  const sortedRecords = computed(() => {
    return [...records.value].sort((a, b) => b.id - a.id)
  })

  // 按类型过滤记录
  const filterByType = (type: string) => {
    return sortedRecords.value.filter((record) => record.type === type)
  }

  // 历史账户界面相关计算属性
  // 过滤掉当前账户的列表，不在表格中显示当前账户
  const filteredHistoryAccounts = computed(() => {
    return accounts.value.filter((acc) => acc.email !== currentAccountEmail.value)
  })

  // 计算高使用量账户
  const highUsageAccounts = computed(() => {
    return accounts.value.filter((account) => {
      // 计算GPT-4使用率，如果超过90%则认为是高使用量账户
      const gpt4MaxUsage = account.gpt4MaxUsage || 500 // 如果没有最大使用量，默认为500
      const gpt4Usage = (account.gpt4Count / gpt4MaxUsage) * 100
      return gpt4Usage >= 90
    })
  })

  /**
   * 初始化历史记录和历史账户
   * 应用启动时调用一次
   */
  async function init() {
    if (initialized.value) return

    try {
      isLoading.value = true

      // 1. 同步本地历史记录到后端
      await syncLocalHistoryToBackend()

      // 2. 同步本地历史账户到后端
      await syncLocalAccountsToBackend()

      // 3. 加载历史记录
      await loadHistoryRecords(false) // 传入 false 避免重复同步

      // 4. 设置历史记录更新监听器
      setupHistoryListener()

      initialized.value = true
    } catch (error) {
      console.error('初始化历史记录失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 加载历史记录
  async function loadHistoryRecords(shouldSync: boolean = true) {
    isLoading.value = true
    error.value = ''

    try {
      // 只有在需要时才同步本地历史记录到后端
      if (shouldSync) {
        await syncLocalHistoryToBackend()
      }

      // 然后从后端获取所有历史记录
      records.value = await getHistoryList()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载历史记录失败'
      console.error('加载历史记录失败:', err)
    } finally {
      isLoading.value = false
    }
  }

  // 监听历史记录更新事件
  function setupHistoryListener() {
    const handler = async () => {
      await loadHistoryRecords()
    }

    window.addEventListener('history_updated', handler)

    return () => {
      window.removeEventListener('history_updated', handler)
    }
  }

  // 历史账户界面相关方法
  /**
   * 获取历史账户列表
   */
  async function fetchHistoryAccounts(shouldSync: boolean = true) {
    loadingAccounts.value = true
    try {
      // 只有在需要时才同步本地账户到后端
      if (shouldSync) {
        await syncLocalAccountsToBackend()
      }

      accounts.value = await getHistoryAccounts()

      // 获取当前账户信息，用于过滤
      const currentAccount = await getMachineIds()
      if (currentAccount.currentAccount) {
        currentAccountEmail.value = currentAccount.currentAccount
      }

      // 自动刷新使用情况
      try {
        await refreshAccountsUsage()
      } catch (error) {
        console.error('自动刷新账户使用情况失败:', error)
      }

      return accounts.value
    } catch (error) {
      console.error('获取历史账户失败:', error)
      throw error
    } finally {
      loadingAccounts.value = false
    }
  }

  /**
   * 刷新账户使用情况
   */
  async function refreshAccountsUsage() {
    loadingAccounts.value = true
    try {
      const historyAccounts = await getHistoryAccounts()

      // 并发获取使用情况
      const updatePromises = historyAccounts.map(async (account) => {
        try {
          const usage = await getUsage(account.token)

          // 提取API使用数据
          const gpt4Usage = usage['gpt-4']
          const gpt35Usage = usage['gpt-3.5-turbo']

          // 更新账户对象
          Object.assign(account, {
            email: account.email,
            token: account.token,
            machineCode: (account as any).machineCode || (account as any).machine_code || '',
            gpt4Count: gpt4Usage?.numRequests || 0,
            gpt35Count: gpt35Usage?.numRequests || 0,
            gpt4MaxUsage: gpt4Usage?.maxRequestUsage != null ? gpt4Usage.maxRequestUsage : 150,
            gpt35MaxUsage: gpt35Usage?.maxRequestUsage != null ? gpt35Usage.maxRequestUsage : 500,
            lastUsed: Date.now(),
          })

          return true
        } catch (error) {
          console.error(`获取账户 ${account.email} 使用情况失败:`, error)
          return false
        }
      })

      // 等待所有请求完成
      const results = await Promise.all(updatePromises)

      // 直接使用更新后的账户列表
      accounts.value = historyAccounts

      return {
        total: historyAccounts.length,
        success: results.filter(Boolean).length,
      }
    } catch (error) {
      console.error('刷新账户使用情况失败:', error)
      throw error
    } finally {
      loadingAccounts.value = false
    }
  }

  /**
   * 删除历史账户
   */
  async function removeHistoryAccountItem(email: string) {
    deletingAccount.value[email] = true
    try {
      await removeHistoryAccount(email)
      accounts.value = accounts.value.filter((a) => a.email !== email)
      return true
    } catch (error) {
      console.error('删除历史账户失败:', error)
      throw error
    } finally {
      deletingAccount.value[email] = false
    }
  }

  /**
   * 清理高使用量账户
   */
  async function clearHighUsageAccounts() {
    if (highUsageAccounts.value.length === 0) {
      return { success: 0 }
    }

    clearingHighUsage.value = true
    try {
      // 并发删除高使用量账户
      const deletePromises = highUsageAccounts.value.map((account) =>
        removeHistoryAccount(account.email),
      )

      await Promise.all(deletePromises)

      // 更新账户列表
      accounts.value = accounts.value.filter((account) => {
        const gpt4MaxUsage = account.gpt4MaxUsage || 500
        const gpt4Usage = (account.gpt4Count / gpt4MaxUsage) * 100
        return gpt4Usage < 90
      })

      return {
        success: highUsageAccounts.value.length,
      }
    } catch (error) {
      console.error('清理高使用量账户失败:', error)
      throw error
    } finally {
      clearingHighUsage.value = false
    }
  }

  /**
   * 保存当前账户到历史记录
   */
  async function saveCurrentAccountToHistory() {
    try {
      const currentAccount = await getMachineIds()
      if (currentAccount.currentAccount && currentAccount.cursorToken) {
        // 记录当前账户的邮箱，用于过滤表格
        currentAccountEmail.value = currentAccount.currentAccount

        // 不再需要前端主动保存账户信息到历史记录
        // 更新 accounts 数据，以确保UI显示最新状态
        await fetchHistoryAccounts(false)

        return true
      }
      return false
    } catch (error) {
      console.error('获取当前账户信息失败:', error)
      return false
    }
  }

  return {
    records,
    isLoading,
    error,
    sortedRecords,
    filterByType,
    loadHistoryRecords,
    setupHistoryListener,
    init,

    // 历史账户界面相关
    accounts,
    currentAccountEmail,
    loadingAccounts,
    switchingAccount,
    deletingAccount,
    clearingHighUsage,
    filteredHistoryAccounts,
    highUsageAccounts,
    fetchHistoryAccounts,
    refreshAccountsUsage,
    removeHistoryAccountItem,
    clearHighUsageAccounts,
    saveCurrentAccountToHistory,
  }
})
