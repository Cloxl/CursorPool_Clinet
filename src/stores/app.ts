import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getPublicInfo,
  checkDisclaimerAccepted,
  setDisclaimerAccepted,
  getUserData,
  setUserData,
} from '@/api'
import type { PublicInfo } from '@/api/types'
import { darkTheme } from 'naive-ui'
import { version as packageVersion } from '../../package.json'

import disclaimerMd from '../disclaimer.md?raw'

// 支持的语言
type SupportedLanguage = 'zh-CN' | 'en-US'

export const useAppStore = defineStore('app', () => {
  // 状态
  const theme = ref<'light' | 'dark'>('light')
  const language = ref<SupportedLanguage>('zh-CN')
  const isLoading = ref(false)
  const appVersion = ref('')
  const publicInfo = ref<PublicInfo | null>(null)

  // 声明状态
  const showDisclaimerModal = ref(false)
  const disclaimerContent = ref(disclaimerMd)
  const disclaimerCountdown = ref(3)
  const canConfirmDisclaimer = ref(false)
  const disclaimerLoading = ref(false)

  // 引导状态
  const tourAccepted = ref<string | null>(null)
  const tourLoading = ref(false)

  // 按钮显示状态
  const showAllButtons = ref(false)

  // Getters
  const isDarkMode = computed(() => theme.value === 'dark')
  const currentTheme = computed(() => (isDarkMode.value ? darkTheme : null))
  const currentLocale = computed(() => language.value)

  // 引导状态的计算属性
  const shouldShowTour = computed(() => {
    return tourAccepted.value !== 'true'
  })

  // Actions
  /**
   * 切换主题
   */
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', theme.value)
  }

  /**
   * 设置主题
   */
  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme
    localStorage.setItem('theme', theme.value)
  }

  /**
   * 设置语言
   */
  function setLanguage(newLanguage: SupportedLanguage) {
    language.value = newLanguage
    localStorage.setItem('language', language.value)
  }

  /**
   * 获取公共信息
   */
  async function fetchPublicInfo() {
    try {
      isLoading.value = true
      const info = await getPublicInfo()
      publicInfo.value = info
      return info
    } catch (error) {
      console.error('获取公共信息失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 设置加载状态
   */
  function setLoading(loading: boolean) {
    isLoading.value = loading
  }

  /**
   * 设置应用版本
   */
  function setAppVersion(version: string) {
    appVersion.value = version
  }

  /**
   * 获取引导状态
   */
  async function fetchTourStatus() {
    try {
      tourLoading.value = true
      const response = await getUserData('user.tour.accepted')

      // 处理不同类型的响应
      if (response === null) {
        // 如果状态为null，设置为false
        console.log('引导状态为null，设置为false')
        await setTourStatus('false')
        tourAccepted.value = 'false'
      } else if (typeof response === 'object' && response !== null) {
        // 尝试处理对象格式的响应
        try {
          // 使用类型断言避免TypeScript错误
          const responseObj = response as any

          if (responseObj.data && responseObj.data.value === null) {
            console.log('引导状态响应对象中data.value为null，设置为false')
            await setTourStatus('false')
            tourAccepted.value = 'false'
          }
        } catch (err) {
          console.error('处理引导状态响应对象失败:', err)
          tourAccepted.value = 'false'
        }
      } else if (typeof response === 'string') {
        tourAccepted.value = response
      } else {
        // 处理其他情况
        console.log('引导状态未知类型，默认设置为false')
        await setTourStatus('false')
        tourAccepted.value = 'false'
      }

      return tourAccepted.value
    } catch (error) {
      console.error('获取引导状态失败:', error)
      return null
    } finally {
      tourLoading.value = false
    }
  }

  /**
   * 设置引导状态
   */
  async function setTourStatus(status: string) {
    try {
      tourLoading.value = true
      await setUserData('user.tour.accepted', status)
      tourAccepted.value = status
      return true
    } catch (error) {
      console.error('设置引导状态失败:', error)
      return false
    } finally {
      tourLoading.value = false
    }
  }

  /**
   * 完成引导
   */
  async function completeTour() {
    return await setTourStatus('true')
  }

  /**
   * 初始化应用设置
   */
  function initAppSettings() {
    // 从本地存储加载主题设置
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'light' || savedTheme === 'dark') {
      theme.value = savedTheme
    } else {
      // 默认使用系统主题
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      theme.value = prefersDark ? 'dark' : 'light'
    }

    // 从本地存储加载语言设置
    const savedLanguage = localStorage.getItem('language')
    if (savedLanguage === 'zh-CN' || savedLanguage === 'en-US') {
      language.value = savedLanguage as SupportedLanguage
    }

    // 从 package.json 加载应用版本
    try {
      // 直接从 package.json 读取版本号
      const version = packageVersion
      setAppVersion(version)
    } catch (error) {
      console.error('加载应用版本失败:', error)
    }

    // 初始化引导状态
    fetchTourStatus().catch((error) => {
      console.error('初始化引导状态失败:', error)
    })
  }

  /**
   * 获取免责声明（检查数据库中是否已接受）
   */
  async function fetchDisclaimer() {
    try {
      disclaimerLoading.value = true

      // 在应用启动时尝试删除本地存储的免责声明状态
      localStorage.removeItem('disclaimer_accepted')

      // 启动倒计时
      const timer = setInterval(() => {
        disclaimerCountdown.value--
        if (disclaimerCountdown.value <= 0) {
          canConfirmDisclaimer.value = true
          clearInterval(timer)
        }
      }, 1000)

      // 从数据库检查是否已接受免责声明
      const accepted = await checkDisclaimerAccepted()
      if (!accepted) {
        showDisclaimerModal.value = true
      }

      return disclaimerContent.value
    } catch (error) {
      console.error('获取免责声明失败:', error)
      throw error
    } finally {
      disclaimerLoading.value = false
    }
  }

  /**
   * 确认免责声明
   */
  async function confirmDisclaimer() {
    try {
      // 将接受状态保存到数据库
      await setDisclaimerAccepted()
      showDisclaimerModal.value = false

      // 确认免责声明后检查引导状态
      await new Promise((resolve) => setTimeout(resolve, 300))

      // 获取最新的引导状态
      await fetchTourStatus()

      return true
    } catch (error) {
      console.error('保存免责声明状态失败:', error)
      return false
    }
  }

  // 初始化时获取按钮显示状态
  async function initButtonSettings() {
    try {
      const value = await getUserData('system.button.hide')
      showAllButtons.value = value === 'true'
    } catch (error) {
      console.error('获取按钮显示状态失败:', error)
      showAllButtons.value = false
    }
  }

  // 设置按钮显示状态
  async function setButtonVisibility(show: boolean) {
    try {
      await setUserData('system.button.hide', show.toString())
      showAllButtons.value = show
    } catch (error) {
      console.error('设置按钮显示状态失败:', error)
    }
  }

  return {
    // 状态
    theme,
    language,
    isLoading,
    appVersion,
    publicInfo,
    showDisclaimerModal,
    disclaimerContent,
    disclaimerCountdown,
    canConfirmDisclaimer,
    disclaimerLoading,
    tourAccepted,
    tourLoading,
    showAllButtons,

    // Getters
    isDarkMode,
    currentTheme,
    currentLocale,
    shouldShowTour,

    // Actions
    toggleTheme,
    setTheme,
    setLanguage,
    fetchPublicInfo,
    setLoading,
    setAppVersion,
    initAppSettings,
    fetchDisclaimer,
    confirmDisclaimer,
    fetchTourStatus,
    setTourStatus,
    completeTour,
    initButtonSettings,
    setButtonVisibility,
  }
})
