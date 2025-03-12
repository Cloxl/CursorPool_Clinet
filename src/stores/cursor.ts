import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  getMachineIds, 
  getUsage, 
  resetMachineId, 
  switchAccount,
  checkHookStatus,
  applyHook,
  restoreHook,
  closeCursor,
  launchCursor,
  checkCursorRunning,
  getAccount,
  saveHistoryRecord
} from '@/api'
import type { UsageInfo, MachineInfo } from '@/api/types'
import type { HistoryAccount } from '@/types/history'
import { useHistoryStore } from './history'

export const useCursorStore = defineStore('cursor', () => {
  // 状态
  const machineCode = ref('')
  const currentAccount = ref('')
  const cursorToken = ref('')
  const cursorInfo = ref<{
    userInfo: any | null,
    usage: UsageInfo | null
  }>({
    userInfo: null,
    usage: null
  })
  const isLoading = ref(false)
  const hookStatus = ref<boolean | null>(null)
  
  // 新增状态
  const operationLoading = ref(false)
  const machineCodeLoading = ref(false)
  const accountSwitchLoading = ref(false)
  const quickChangeLoading = ref(false)
  const isForceKilling = ref(false)
  const needSaveCurrentAccount = ref(false)

  // Getters
  const gpt4Usage = computed(() => {
    const usage = cursorInfo.value?.usage?.['gpt-4']
    if (!usage) return { used: 0, total: 0, percentage: 0 }
    return {
      used: usage.numRequests || 0,
      total: usage.maxRequestUsage || 0,
      percentage: getUsagePercentage(usage.numRequests, usage.maxRequestUsage)
    }
  })

  const gpt35Usage = computed(() => {
    const usage = cursorInfo.value?.usage?.['gpt-3.5-turbo']
    if (!usage) return { used: 0, total: 0, percentage: 0 }
    return {
      used: usage.numRequests || 0,
      total: usage.maxRequestUsage || 0,
      percentage: getUsagePercentage(usage.numRequests, usage.maxRequestUsage)
    }
  })

  const isHooked = computed(() => hookStatus.value === true)

  // 辅助函数
  function getUsagePercentage(used: number | null | undefined, total: number | null | undefined) {
    if (!used || !total) return 0
    return Math.min(100, Math.round((used / total) * 100))
  }

  // 格式化日期函数
  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  // Actions
  /**
   * 获取机器码信息
   * @returns MachineInfo 机器码信息
   */
  async function fetchMachineIds(): Promise<MachineInfo> {
    try {
      isLoading.value = true
      const result = await getMachineIds()
      machineCode.value = result.machineId
      currentAccount.value = result.currentAccount
      cursorToken.value = result.cursorToken
      
      // 获取 Hook 状态
      await checkHook()
      
      return result
    } catch (error) {
      console.error('获取机器码失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 获取 Cursor 使用量
   */
  async function fetchCursorUsage() {
    try {
      if (!cursorToken.value) {
        await fetchMachineIds()
      }
      
      if (!cursorToken.value) {
        console.error('未找到 Cursor Token')
        return
      }

      isLoading.value = true
      const usageData = await getUsage(cursorToken.value)
      
      cursorInfo.value = {
        userInfo: {
          email: currentAccount.value,
          email_verified: true,
          name: currentAccount.value.split('@')[0],
          sub: '',
          updated_at: new Date().toISOString(),
          picture: null
        },
        usage: usageData
      }
    } catch (error) {
      console.error('获取 Cursor 使用量失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 重置机器码
   */
  async function resetMachine(params: { forceKill?: boolean, machineId?: string } = {}) {
    try {
      machineCodeLoading.value = true
      isLoading.value = true
      
      // 检查 Cursor 是否在运行
      if (!params.forceKill) {
        const isRunning = await checkCursorRunning()
        if (isRunning) {
          throw new Error('Cursor进程正在运行, 请先关闭Cursor')
        }
      }
      
      await resetMachineId(params)
      
      // 添加历史记录
      await saveHistoryRecord({
        id: Date.now(),
        type_name: '机器码修改',
        detail: `修改机器码: ${machineCode.value}`,
        timestamp: new Date().toISOString(),
        operator: '用户'
      })
      
      // 重置成功后刷新数据
      await fetchMachineIds()
      await fetchCursorUsage()
      return true
    } catch (error) {
      console.error('重置机器码失败:', error)
      throw error
    } finally {
      isLoading.value = false
      machineCodeLoading.value = false
    }
  }

  /**
   * 切换账户
   */
  async function switchCursorAccount(email?: string, token?: string, forceKill: boolean = false) {
    try {
      accountSwitchLoading.value = true
      isLoading.value = true
      
      // 检查 Cursor 是否在运行
      if (!forceKill) {
        const isRunning = await checkCursorRunning()
        if (isRunning) {
          throw new Error('Cursor进程正在运行, 请先关闭Cursor')
        }
      }
      
      // 如果未提供邮箱和token，则自动获取
      if (!email || !token) {
        const accountInfo = await getAccount(undefined, '1')
        if (!accountInfo.account_info.account || !accountInfo.account_info.token) {
          throw new Error('无法获取账户信息')
        }
        email = accountInfo.account_info.account
        token = accountInfo.account_info.token
      }
      
      await switchAccount(email, token, forceKill)
      
      // 添加历史记录
      await saveHistoryRecord({
        id: Date.now(),
        type_name: '账户切换',
        detail: `切换到账户: ${email} 扣除50积分`,
        timestamp: new Date().toISOString(),
        operator: '用户'
      })
      
      // 切换成功后刷新数据
      await fetchMachineIds()
      await fetchCursorUsage()
      return true
    } catch (error) {
      console.error('切换账户失败:', error)
      throw error
    } finally {
      isLoading.value = false
      accountSwitchLoading.value = false
    }
  }

  /**
   * 一键更换（账户+机器码）
   */
  async function quickChange(email?: string, token?: string, forceKill: boolean = false) {
    try {
      quickChangeLoading.value = true
      isLoading.value = true
      
      // 检查 Cursor 是否在运行
      if (!forceKill) {
        const isRunning = await checkCursorRunning()
        if (isRunning) {
          throw new Error('Cursor进程正在运行, 请先关闭Cursor')
        }
      }
      
      // 如果未提供邮箱和token，则自动获取
      if (!email || !token) {
        const accountInfo = await getAccount(undefined, '1')
        if (!accountInfo.account_info.account || !accountInfo.account_info.token) {
          throw new Error('无法获取账户信息')
        }
        email = accountInfo.account_info.account
        token = accountInfo.account_info.token
      }
      
      // 先重置机器码
      await resetMachineId({ forceKill })
      
      // 再切换账户
      await switchAccount(email, token, forceKill)
      
      // 添加历史记录
      await saveHistoryRecord({
        id: Date.now(),
        type_name: '一键切换',
        detail: `切换到账户: ${email} 并重置机器码 扣除50积分`,
        timestamp: new Date().toISOString(),
        operator: '用户'
      })
      
      // 刷新数据
      await fetchMachineIds()
      await fetchCursorUsage()
      
      return true
    } catch (error) {
      console.error('一键更换失败:', error)
      throw error
    } finally {
      isLoading.value = false
      quickChangeLoading.value = false
    }
  }

  /**
   * 检查 Hook 状态
   */
  async function checkHook() {
    try {
      hookStatus.value = await checkHookStatus()
      return hookStatus.value
    } catch (error) {
      console.error('检查 Hook 状态失败:', error)
      hookStatus.value = null
      throw error
    }
  }

  /**
   * 应用 Hook
   */
  async function applyHookToClient(forceKill: boolean = false) {
    try {
      operationLoading.value = true
      isLoading.value = true
      await applyHook(forceKill)
      hookStatus.value = true
      return true
    } catch (error) {
      console.error('应用 Hook 失败:', error)
      throw error
    } finally {
      isLoading.value = false
      operationLoading.value = false
      await checkHook()
    }
  }

  /**
   * 恢复 Hook
   */
  async function restoreHookFromClient(forceKill: boolean = false) {
    try {
      operationLoading.value = true
      isLoading.value = true
      await restoreHook(forceKill)
      hookStatus.value = false
      return true
    } catch (error) {
      console.error('恢复 Hook 失败:', error)
      throw error
    } finally {
      isLoading.value = false
      operationLoading.value = false
      await checkHook()
    }
  }

  /**
   * 关闭 Cursor
   */
  async function closeCursorApp() {
    try {
      operationLoading.value = true
      return await closeCursor()
    } catch (error) {
      console.error('关闭 Cursor 失败:', error)
      throw error
    } finally {
      operationLoading.value = false
    }
  }

  /**
   * 启动 Cursor
   */
  async function launchCursorApp() {
    try {
      operationLoading.value = true
      return await launchCursor()
    } catch (error) {
      console.error('启动 Cursor 失败:', error)
      throw error
    } finally {
      operationLoading.value = false
    }
  }
  
  /**
   * 检查是否需要注入Hook并自动注入
   */
  async function ensureHookApplied() {
    // 检查 Hook 状态
    await checkHook()
    
    // 如果未注入，尝试自动注入
    if (!hookStatus.value) {
      return await applyHookToClient(false)
    }
    
    return true
  }
  
  /**
   * 刷新所有Cursor相关数据
   */
  async function refreshAllCursorData() {
    try {
      isLoading.value = true
      await fetchMachineIds()
      await fetchCursorUsage()
      return true
    } catch (error) {
      console.error('刷新数据失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 切换到历史账户
   */
  async function switchToHistoryAccount(account: HistoryAccount) {
    const historyStore = useHistoryStore()
    historyStore.switchingAccount[account.email] = true
    
    try {
      // 检查Cursor是否在运行
      const isRunning = await checkCursorRunning()
      if (isRunning) {
        // 返回需要处理的状态
        return { 
          status: 'running', 
          account 
        }
      }
    
      // 检查钩子状态
      const hookStatus = await checkHookStatus()
      if (!hookStatus) {
        const hookSuccess = await applyHookToClient(false)
        if (!hookSuccess) {
          return { 
            status: 'hook_failed' 
          }
        }
      }
      
      // 切换账户 - 后端会自动保存历史记录
      await resetMachineId({ machineId: account.machineCode })
      await switchAccount(account.email, account.token, false)
      
      await saveHistoryRecord({
        id: Date.now(),
        type_name: '历史账户切换',
        detail: `切换到历史账户: ${account.email}`,
        timestamp: new Date().toISOString(),
        operator: '用户'
      })
      
      // 刷新数据
      await fetchMachineIds()
      await fetchCursorUsage()
      
      return { 
        status: 'success' 
      }
    } catch (error) {
      console.error('切换到历史账户失败:', error)
      throw error
    } finally {
      historyStore.switchingAccount[account.email] = false
    }
  }
  
  /**
   * 强制关闭并切换账户
   */
  async function forceCloseAndSwitch(account: HistoryAccount) {
    const historyStore = useHistoryStore()
    historyStore.switchingAccount[account.email] = true
    isForceKilling.value = true
    
    try {
      // 关闭 Cursor
      await closeCursorApp()
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 检查并应用钩子
      if (!(await checkHookStatus())) {
        const hookSuccess = await applyHookToClient(true)
        if (!hookSuccess) {
          return { status: 'hook_failed' }
        }
      }
      
      // 账户切换 - 后端会自动保存历史记录
      await resetMachineId({ machineId: account.machineCode })
      await switchAccount(account.email, account.token, true)
      
      await saveHistoryRecord({
        id: Date.now(),
        type_name: '历史账户切换',
        detail: `切换到历史账户: ${account.email}`,
        timestamp: new Date().toISOString(),
        operator: '用户'
      })
      
      // 刷新数据
      await fetchMachineIds()
      await fetchCursorUsage()
      
      // 启动 Cursor
      await launchCursorApp()
      
      return { status: 'success' }
    } catch (error) {
      console.error('强制切换账户失败:', error)
      throw error
    } finally {
      needSaveCurrentAccount.value = false
      isForceKilling.value = false
      historyStore.switchingAccount[account.email] = false
    }
  }

  return {
    // 状态
    machineCode,
    currentAccount,
    cursorToken,
    cursorInfo,
    isLoading,
    hookStatus,
    operationLoading,
    machineCodeLoading,
    accountSwitchLoading,
    quickChangeLoading,
    isForceKilling,
    needSaveCurrentAccount,
    
    // Getters
    gpt4Usage,
    gpt35Usage,
    isHooked,
    formatDate,
    
    // Actions
    fetchMachineIds,
    fetchCursorUsage,
    resetMachine,
    switchCursorAccount,
    quickChange,
    checkHook,
    applyHookToClient,
    restoreHookFromClient,
    closeCursorApp,
    launchCursorApp,
    ensureHookApplied,
    refreshAllCursorData,
    switchToHistoryAccount,
    forceCloseAndSwitch
  }
})