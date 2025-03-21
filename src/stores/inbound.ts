import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getUserData, setUserData } from '../api'

export interface InboundItem {
  name: string
  url: string
}

export interface InboundConfig {
  inbound: InboundItem[]
}

export const useInboundStore = defineStore('inbound', () => {
  // 状态
  const isLoading = ref(false)
  const inboundList = ref<InboundItem[]>([])
  const currentInboundIndex = ref(0)

  // 计算属性
  const currentInbound = computed(() => {
    if (inboundList.value.length === 0) return null
    return inboundList.value[currentInboundIndex.value] || inboundList.value[0]
  })

  // 获取线路列表
  async function fetchInboundList() {
    isLoading.value = true
    try {
      const configData = await getUserData('system.inbound.config')
      if (configData) {
        const config = JSON.parse(configData) as InboundConfig
        inboundList.value = config.inbound
      } else {
        console.warn('未获取到线路配置')
        inboundList.value = []
      }

      // 获取当前选择的线路索引
      const currentIndex = await getUserData('system.inbound.current')
      if (currentIndex) {
        const index = parseInt(currentIndex)
        if (!isNaN(index) && index >= 0 && index < inboundList.value.length) {
          currentInboundIndex.value = index
        }
      }
    } catch (error) {
      console.error('获取线路配置失败:', error)
      inboundList.value = []
    } finally {
      isLoading.value = false
    }
  }

  // 切换线路
  async function switchInbound(index: number) {
    if (index < 0 || index >= inboundList.value.length) {
      console.error('无效的线路索引:', index)
      return false
    }

    try {
      // 保存选择到后端
      await setUserData('system.inbound.current', index.toString())
      currentInboundIndex.value = index
      return true
    } catch (error) {
      console.error('切换线路失败:', error)
      return false
    }
  }

  return {
    isLoading,
    inboundList,
    currentInboundIndex,
    currentInbound,
    fetchInboundList,
    switchInbound,
  }
})
