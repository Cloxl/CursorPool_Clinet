<script setup lang="ts">
  import { NLayout, NLayoutSider, NMenu, NIcon, NSpin } from 'naive-ui'
  import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
  import type { Router } from 'vue-router'
  import { useRouter } from 'vue-router'
  import {
    HomeSharp,
    SettingsSharp,
    TimeSharp,
    Close,
    RemoveOutline,
    ArrowUndo,
  } from '@vicons/ionicons5'
  import ThemeToggle from '../components/ThemeToggle.vue'
  import LoginOverlay from '../components/LoginOverlay.vue'
  import CloseConfirmModal from '../components/CloseConfirmModal.vue'
  import { Component, h } from 'vue'
  import { useI18n } from '../locales'
  import { messages } from '../locales/messages'
  import { Window } from '@tauri-apps/api/window'
  import { platform } from '@tauri-apps/plugin-os'
  import { useUserStore, useAppCloseStore } from '../stores'

  // 基础状态
  const router = useRouter() as unknown as Router
  const { currentLang, i18n } = useI18n()
  const appWindow = Window.getCurrent()
  const userStore = useUserStore()
  const appCloseStore = useAppCloseStore()

  // 平台相关状态
  const currentPlatform = ref('')
  const isMacOS = computed(() => currentPlatform.value === 'macos')

  // 登录状态管理 - 使用计算属性从store获取状态
  const isCheckingLogin = computed(() => userStore.isCheckingLogin)
  const isLoggedIn = computed(() => userStore.isLoggedIn)
  const showLoginOverlay = computed(() => !isLoggedIn.value && !isCheckingLogin.value)

  // 侧边栏状态
  const collapsed = ref(true)
  const contentMarginLeft = computed(() => (collapsed.value ? '64px' : '200px'))
  const currentPath = computed(() => router.currentRoute.value.path.substring(1) || 'dashboard')

  /**
   * 监听用户登出事件
   */
  const handleUserLogout = () => {
    // 确保路由跳转到dashboard
    if (router.currentRoute.value.path !== '/dashboard') {
      router.push('/dashboard')
    }
  }

  /**
   * 渲染菜单图标
   */
  function renderIcon(icon: Component) {
    return () =>
      h(NIcon, null, {
        default: () => h(icon),
      })
  }

  /**
   * 菜单选项配置
   */
  const menuOptions = computed(() => [
    {
      label: messages[currentLang.value].menu.dashboard,
      key: 'dashboard',
      icon: renderIcon(HomeSharp),
    },
    {
      label: '历史账户',
      key: 'accounts',
      icon: renderIcon(ArrowUndo),
    },
    {
      label: messages[currentLang.value].menu.history,
      key: 'history',
      icon: renderIcon(TimeSharp),
    },
    {
      label: messages[currentLang.value].menu.settings,
      key: 'settings',
      icon: renderIcon(SettingsSharp),
    },
  ])

  /**
   * 处理菜单点击事件
   */
  function handleMenuClick(key: string) {
    router.push(`/${key}`)
  }

  /**
   * 窗口控制函数
   */
  const windowControls = {
    async minimize() {
      await appWindow.minimize()
    },

    async close() {
      await appCloseStore.handleCloseRequest()
    },
  }

  /**
   * 处理登录成功
   */
  const handleLoginSuccess = async () => {
    // 使用store检查登录状态
    await userStore.checkLoginStatus()
  }

  // 组件挂载时
  onMounted(async () => {
    // 使用store检查登录状态
    await userStore.checkLoginStatus()

    // 获取平台信息
    try {
      currentPlatform.value = await platform()
    } catch (error) {
      console.error('获取平台信息失败:', error)
    }

    // 添加用户登出事件监听
    window.addEventListener('user-logout', handleUserLogout)
  })

  // 组件卸载时
  onUnmounted(() => {
    // 移除事件监听
    window.removeEventListener('user-logout', handleUserLogout)
  })

  // 监听store中的登录状态变化
  watch(
    () => userStore.isLoggedIn,
    (newValue) => {
      if (!newValue) {
        if (router.currentRoute.value.path !== '/dashboard') {
          router.push('/dashboard')
        } else {
          router.replace('/dashboard')
        }
      }
    },
  )
</script>

<template>
  <n-layout has-sider :style="isMacOS ? {} : { borderRadius: '6px' }" style="height: 100vh">
    <!-- 统一的拖拽区域 -->
    <div class="drag-region" data-tauri-drag-region></div>

    <!-- 登录遮罩 -->
    <login-overlay v-if="showLoginOverlay" @login-success="handleLoginSuccess" />

    <!-- 加载指示器 -->
    <div v-if="isCheckingLogin" class="loading-overlay">
      <n-spin size="large" />
    </div>

    <!-- 窗口控制按钮 -->
    <div
      class="window-controls"
      :class="{
        'mac-controls': isMacOS,
      }"
    >
      <div class="control-button minimize" @click="windowControls.minimize">
        <n-icon>
          <RemoveOutline />
        </n-icon>
      </div>
      <div class="control-button close" @click="windowControls.close">
        <n-icon>
          <Close />
        </n-icon>
      </div>
    </div>

    <!-- 侧边栏 -->
    <n-layout-sider
      bordered
      collapse-mode="width"
      :collapsed-width="64"
      :width="200"
      :collapsed="collapsed"
      show-trigger
      :native-scrollbar="false"
      style="position: fixed; height: 100vh; left: 0; top: 0; z-index: 999"
      data-tauri-drag-region
      @collapse="collapsed = true"
      @expand="collapsed = false"
    >
      <div class="logo">
        <h2 v-if="!collapsed" style="user-select: none">
          {{ i18n.appName }}
        </h2>
        <h2 v-else style="user-select: none">CP</h2>
      </div>
      <n-menu
        :options="menuOptions"
        :collapsed="collapsed"
        :collapsed-width="64"
        :collapsed-icon-size="24"
        :icon-size="24"
        :value="currentPath"
        style="-webkit-app-region: no-drag"
        @update:value="handleMenuClick"
      />
      <div class="sider-footer" style="-webkit-app-region: no-drag">
        <theme-toggle style="-webkit-app-region: no-drag" />
      </div>
    </n-layout-sider>

    <!-- 主内容区 -->
    <n-layout
      :native-scrollbar="false"
      content-style="padding: 40px 24px 24px 24px;"
      :style="{
        marginLeft: contentMarginLeft,
      }"
    >
      <router-view />
    </n-layout>
  </n-layout>

  <!-- 添加CloseConfirmModal组件 -->
  <close-confirm-modal />
</template>

<style scoped>
  .logo {
    padding: 16px;
    text-align: center;
  }

  .logo h2 {
    margin: 0;
    font-size: 1.25rem;
    white-space: nowrap;
  }

  .sider-footer {
    position: absolute;
    bottom: 16px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    padding: 0 16px;
    z-index: 1;
  }

  /* 统一的拖拽区域样式 */
  .drag-region {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 30px;
    z-index: 1000;
    -webkit-app-region: drag;
  }

  /* 窗口控制按钮容器 */
  .window-controls {
    position: fixed;
    top: 0;
    right: 0;
    display: flex;
    z-index: 10000;
    height: 32px;
  }

  /* 控制按钮基础样式 */
  .control-button {
    width: 46px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
  }

  /* 最小化按钮悬停效果 */
  .control-button.minimize:hover {
    background-color: rgba(128, 128, 128, 0.2);
  }

  .control-button.minimize:hover :deep(.n-icon) {
    color: var(--n-text-color);
  }

  /* 关闭按钮悬停效果 */
  .control-button.close:hover {
    background-color: #e81123;
  }

  .control-button.close:hover :deep(.n-icon) {
    color: #ffffff;
  }

  /* 图标样式 */
  :deep(.n-icon) {
    font-size: 16px;
    color: var(--n-text-color);
    transition: color 0.2s;
    transform: scale(1.1);
    display: flex;
    align-items: center;
  }

  /* 最小化按钮图标特殊调整 */
  .control-button.minimize :deep(.n-icon) {
    transform: scale(1.1);
    margin-top: 2px;
  }

  /* 关闭按钮图标微调 */
  .control-button.close :deep(.n-icon) {
    transform: scale(1.1);
    margin-top: 2px;
  }

  /* macOS 样式适配 */
  .mac-controls {
    top: 0;
    right: 0;
  }

  /* 暗色主题适配 */
  :root[data-theme='dark'] .control-button.minimize:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  :root[data-theme='dark'] .control-button.close:hover {
    background-color: #e81123;
  }

  /* 禁用浏览器默认滚动条 */
  :deep(html),
  :deep(body) {
    margin: 0;
    padding: 0;
    height: 100vh;
    overflow: hidden;
  }

  /* 移除之前的滚动条样式，因为现在使用 naive-ui 的滚动条 */
  :deep(.n-layout-scroll-container) {
    &::-webkit-scrollbar {
      display: none;
    }
  }

  /* 调整菜单图标样式 */
  :deep(.n-menu-item-content-header) {
    display: flex;
    align-items: center;
  }

  :deep(.n-menu .n-menu-item .n-icon) {
    font-size: 20px;
    margin-right: 12px;
  }

  :deep(.n-menu.n-menu--collapsed .n-menu-item .n-icon) {
    margin-right: 0;
    margin-left: 4px;
  }

  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    z-index: 1000;
  }
</style>
