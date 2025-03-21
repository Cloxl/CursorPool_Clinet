import { ref } from 'vue'
import { darkTheme } from 'naive-ui'
import type { GlobalTheme } from 'naive-ui'

// 从本地存储读取主题设置, 默认为深色
const savedTheme = localStorage.getItem('theme-mode')
export const isDarkMode = ref(savedTheme === null ? true : savedTheme === 'dark')
export const currentTheme = ref<GlobalTheme | null>(isDarkMode.value ? darkTheme : null)

export function useTheme() {
  // 监听主题变化并保存到本地存储
  const watchTheme = (newValue: boolean) => {
    localStorage.setItem('theme-mode', newValue ? 'dark' : 'light')
  }

  const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value
    currentTheme.value = isDarkMode.value ? darkTheme : null
    watchTheme(isDarkMode.value)
  }

  return {
    isDarkMode,
    currentTheme,
    toggleTheme,
  }
}
