<script setup lang="ts">
  import { NConfigProvider, NMessageProvider, NGlobalStyle, NDialogProvider } from 'naive-ui'
  import { useTheme } from './composables/theme'
  import { themeOverrides } from './styles/theme'
  import { useI18n, initLanguage } from './locales'
  import { locales } from './locales'
  import { computed, onMounted } from 'vue'
  import { useHistoryStore, useUpdaterStore, useInboundStore, useAppCloseStore } from './stores'
  import UpdateOverlay from './components/UpdateOverlay.vue'
  import CloseConfirmModal from './components/CloseConfirmModal.vue'
  import { Window } from '@tauri-apps/api/window'

  const { currentTheme } = useTheme()
  const { currentLang } = useI18n()
  const historyStore = useHistoryStore()
  const updaterStore = useUpdaterStore()
  const inboundStore = useInboundStore()
  const appCloseStore = useAppCloseStore()

  const locale = computed(() => locales[currentLang.value].locale)
  const dateLocale = computed(() => locales[currentLang.value].dateLocale)

  // 应用启动时初始化
  onMounted(async () => {
    // 初始化语言设置
    await initLanguage()

    // 使用统一的初始化方法
    await historyStore.init()

    // 初始化线路配置
    await inboundStore.fetchInboundList()

    // 自动检查更新
    await updaterStore.checkForUpdates()

    // 添加关闭事件监听
    const appWindow = Window.getCurrent()
    appWindow.onCloseRequested(async (event) => {
      event.preventDefault()
      appCloseStore.handleCloseRequest()
    })
  })
</script>

<template>
  <n-config-provider
    :theme="currentTheme"
    :theme-overrides="themeOverrides"
    :locale="locale"
    :date-locale="dateLocale"
  >
    <n-dialog-provider>
      <n-message-provider>
        <router-view />
        <n-global-style />
        <update-overlay v-if="updaterStore.isUpdating || updaterStore.hasUpdate" />
        <close-confirm-modal />
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>
