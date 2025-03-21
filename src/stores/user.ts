import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getUserInfo,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  activate as apiActivate,
  changePassword as apiChangePassword,
  resetPassword as apiResetPassword,
  checkAdminPrivileges,
  checkIsWindows,
} from '@/api'
import type { UserInfo } from '@/api/types'

export const useUserStore = defineStore('user', () => {
  // 状态
  const isLoggedIn = ref(false)
  const isCheckingLogin = ref(true)
  const userInfo = ref<UserInfo | null>(null)
  const loginError = ref('')

  // 添加管理员权限状态
  const isAdmin = ref<boolean | null>(null)
  const isCheckingAdmin = ref(false)

  const activationCode = ref('')
  const activationLoading = ref(false)
  const activationError = ref('')

  // Getters
  const username = computed(() => userInfo.value?.username || '')
  const expiryDate = computed(() => userInfo.value?.expireTime || '')
  const memberLevel = computed(() => userInfo.value?.level || 1)

  // 计算用户积分
  const userCredits = computed(() => {
    if (!userInfo.value) {
      return 0
    }
    return (userInfo.value.totalCount - userInfo.value.usedCount) * 50
  })

  /**
   * 检查是否以管理员权限运行
   */
  async function checkIsAdmin() {
    try {
      isCheckingAdmin.value = true
      const adminStatus = await checkAdminPrivileges()
      isAdmin.value = adminStatus

      // 如果不是管理员，检查是否是 Windows 平台
      if (!adminStatus) {
        const isWinPlatform = await checkIsWindows()
        // 只有在 Windows 平台才需要管理员权限
        // 如果不是 Windows 平台，则视为有权限
        if (!isWinPlatform) {
          isAdmin.value = true
        }
      }

      return isAdmin.value
    } catch (error) {
      console.error('检查管理员权限失败:', error)
      isAdmin.value = null
      throw error
    } finally {
      isCheckingAdmin.value = false
    }
  }

  // Actions
  /**
   * 检查用户登录状态
   */
  async function checkLoginStatus() {
    try {
      isCheckingLogin.value = true
      const info = await getUserInfo()
      userInfo.value = info
      isLoggedIn.value = true
      loginError.value = ''
    } catch (error) {
      console.error('Failed to check login status:', error)
      userInfo.value = null
      isLoggedIn.value = false
    } finally {
      isCheckingLogin.value = false
    }
  }

  /**
   * 用户登录
   */
  async function login(account: string, password: string, spread: string = 'web') {
    try {
      const response = await apiLogin(account, password, spread)
      if (response && response.token) {
        await checkLoginStatus()
        return true
      }
      return false
    } catch (error) {
      loginError.value = error instanceof Error ? error.message : '登录失败'
      throw error
    }
  }

  /**
   * 用户注册
   */
  async function register(email: string, code: string, password: string, spread: string = 'web') {
    try {
      const response = await apiRegister(email, code, password, spread)
      if (response && response.token) {
        // 保存token后调用检查登录状态接口获取用户信息
        await checkLoginStatus()

        // 如果获取用户信息失败，尝试直接登录
        if (!isLoggedIn.value) {
          await login(email, password, spread)
        }

        return true
      }
      return false
    } catch (error) {
      loginError.value = error instanceof Error ? error.message : '注册失败'
      throw error
    }
  }

  /**
   * 用户登出
   */
  async function logout() {
    try {
      // 先更新状态，再调用API
      userInfo.value = null
      isLoggedIn.value = false
      loginError.value = ''

      // 调用登出API
      await apiLogout()

      // 触发一个全局事件，通知应用用户已登出
      window.dispatchEvent(new CustomEvent('user-logout'))

      return true
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    }
  }

  /**
   * 激活码兑换
   */
  async function activateCode(code: string) {
    try {
      activationLoading.value = true
      activationError.value = ''

      await apiActivate(code)

      // 激活成功后刷新用户信息
      await checkLoginStatus()

      // 重置激活码状态
      activationCode.value = ''

      return true
    } catch (error) {
      activationError.value = error instanceof Error ? error.message : '激活失败'
      console.error('Activation failed:', error)
      throw error
    } finally {
      activationLoading.value = false
    }
  }

  /**
   * 修改密码
   */
  async function changePassword(oldPassword: string, newPassword: string) {
    try {
      await apiChangePassword(oldPassword, newPassword)
      // 修改密码成功后登出
      await logout()
      return true
    } catch (error) {
      console.error('Change password failed:', error)
      throw error
    }
  }

  /**
   * 重置密码
   */
  async function resetPassword(email: string, code: string, password: string) {
    try {
      await apiResetPassword(email, code, password)
      return true
    } catch (error) {
      console.error('Reset password failed:', error)
      throw error
    }
  }

  /**
   * 检查积分是否足够
   */
  function checkCredits(requiredCredits: number = 50) {
    return userCredits.value >= requiredCredits
  }

  // 返回 store 对象
  return {
    // 状态
    isLoggedIn,
    isCheckingLogin,
    userInfo,
    loginError,
    isAdmin,
    isCheckingAdmin,
    activationCode,
    activationLoading,
    activationError,

    // Getters
    username,
    expiryDate,
    memberLevel,
    userCredits,

    // Actions
    checkLoginStatus,
    login,
    register,
    logout,
    activateCode,
    changePassword,
    resetPassword,
    checkCredits,
    checkIsAdmin,
  }
})
