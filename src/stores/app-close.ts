import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getUserData, setUserData, delUserData } from '@/api'
import { Window } from '@tauri-apps/api/window'
import { exit } from '@tauri-apps/plugin-process'

export const useAppCloseStore = defineStore('app-close', () => {
  // 状态
  const showConfirmModal = ref(false)
  const closeType = ref<'minimize' | 'exit'>('exit')
  const savePreference = ref(true)

  // 获取应用窗口
  const appWindow = Window.getCurrent()

  /**
   * 初始化时获取设置
   */
  async function initSettings() {
    try {
      const savedCloseType = await getUserData('system.close.type')
      if (savedCloseType === 'minimize' || savedCloseType === 'exit') {
        closeType.value = savedCloseType as 'minimize' | 'exit'
      }
    } catch (error) {
      console.error('获取关闭类型设置失败:', error)
    }
  }

  /**
   * 处理应用关闭请求
   */
  async function handleCloseRequest() {
    try {
      // 检查数据库中是否有关闭类型设置
      const savedCloseType = await getUserData('system.close.type')

      if (savedCloseType === 'minimize') {
        // 如果设置为最小化，直接最隐藏
        await appWindow.hide()
      } else if (savedCloseType === 'exit') {
        // 如果设置为退出，直接退出应用
        await exit(0)
      } else {
        // 如果没有设置或设置为其他值，显示确认模态窗
        showConfirmModal.value = true
      }
    } catch (error) {
      console.error('检查关闭类型设置失败:', error)
      // 如果获取设置失败，显示确认模态窗
      showConfirmModal.value = true
    }
  }

  /**
   * 确认关闭应用
   */
  async function confirmClose() {
    try {
      // 如果选择保存偏好，将选择保存到数据库
      if (savePreference.value) {
        await setUserData('system.close.type', closeType.value)
      }

      // 根据选择执行相应操作
      if (closeType.value === 'minimize') {
        await appWindow.hide()
      } else {
        await exit(0)
      }

      // 关闭模态窗
      showConfirmModal.value = false
    } catch (error) {
      console.error('处理关闭操作错误:', error)
      throw error
    }
  }

  /**
   * 保存关闭类型设置
   */
  async function saveCloseType(type: 'minimize' | 'exit' | null) {
    try {
      if (type === null) {
        // 如果类型为null，则清除设置
        console.log('正在删除关闭类型设置...')
        await delUserData('system.close.type')
        // 验证删除是否成功
        const checkValue = await getUserData('system.close.type')
        if (checkValue === null) {
          console.log('删除关闭类型设置成功')
        } else {
          console.warn('删除关闭类型设置后验证失败，仍存在值:', checkValue)
        }
        closeType.value = 'exit' // 恢复默认值
      } else {
        // 保存设置
        console.log(`正在保存关闭类型设置: ${type}`)
        await setUserData('system.close.type', type)
        // 验证保存是否成功
        const checkValue = await getUserData('system.close.type')
        if (checkValue === type) {
          console.log(`保存关闭类型设置成功: ${checkValue}`)
        } else {
          console.warn(`保存关闭类型设置后验证失败，预期:${type}, 实际:${checkValue}`)
        }
        closeType.value = type
      }
      return true
    } catch (error) {
      console.error('保存关闭类型设置失败:', error)
      return false
    }
  }

  /**
   * 取消关闭应用
   */
  function cancelClose() {
    showConfirmModal.value = false
  }

  return {
    showConfirmModal,
    closeType,
    savePreference,
    handleCloseRequest,
    confirmClose,
    cancelClose,
    initSettings,
    saveCloseType,
  }
})
