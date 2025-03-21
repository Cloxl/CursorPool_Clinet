<script setup lang="ts">
  import { computed } from 'vue'
  import { NProgress, NSpin, NCard, NSpace } from 'naive-ui'
  import { useUpdaterStore } from '../stores/updater'

  const updaterStore = useUpdaterStore()

  // 计算下载状态文本
  const statusText = computed(() => {
    if (updaterStore.isChecking) return '正在检查更新...'
    if (updaterStore.isDownloading) return `正在下载更新 (${updaterStore.progressPercentage}%)...`
    if (updaterStore.isInstalling) return '正在安装更新，应用即将重启...'
    if (updaterStore.error) return `更新失败: ${updaterStore.error}`
    return '准备更新...'
  })

  // 计算进度条颜色
  const progressColor = computed(() => {
    if (updaterStore.error) return '#ff4d4f'
    if (updaterStore.progressPercentage >= 100) return '#52c41a'
    return '#2080f0'
  })

  // 计算是否显示加载图标
  const showSpinner = computed(
    () =>
      updaterStore.isChecking ||
      (updaterStore.isDownloading && updaterStore.progressPercentage < 5),
  )
</script>

<template>
  <div class="update-overlay">
    <n-card class="update-card" title="应用更新">
      <div class="update-content">
        <div v-if="showSpinner" class="loading-spinner">
          <n-spin size="large" />
        </div>

        <div class="status-text">
          {{ statusText }}
        </div>

        <n-space vertical class="progress-container">
          <n-progress
            type="line"
            :percentage="updaterStore.progressPercentage"
            :color="progressColor"
            :height="20"
            :processing="updaterStore.isDownloading"
            indicator-placement="inside"
          />
        </n-space>

        <div v-if="updaterStore.isDownloading" class="byte-info">
          {{ Math.round((updaterStore.downloadedBytes / 1024 / 1024) * 100) / 100 }}
          MB /
          {{ Math.round((updaterStore.totalBytes / 1024 / 1024) * 100) / 100 }}
          MB
        </div>
      </div>
    </n-card>
  </div>
</template>

<style scoped>
  .update-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.65);
    backdrop-filter: blur(8px);
    z-index: 1000;
    user-select: none;
  }

  .update-card {
    width: 460px;
    max-width: 90%;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  .update-content {
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .loading-spinner {
    margin-bottom: 16px;
  }

  .status-text {
    font-size: 16px;
    margin-bottom: 16px;
    text-align: center;
  }

  .progress-container {
    width: 100%;
    margin-bottom: 8px;
  }

  .byte-info {
    font-size: 12px;
    color: var(--n-text-color-3);
    margin-top: 4px;
  }

  :deep(.n-card-header) {
    text-align: center;
    font-size: 1.5em;
    padding-top: 14px;
    padding-bottom: 4px;
  }

  :deep(.n-progress-text) {
    font-size: 14px;
    margin-left: 8px;
  }

  :deep(.n-progress-info) {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-weight: bold;
  }

  :deep(.n-progress-graph) {
    background-color: rgba(0, 0, 0, 0.08);
  }

  :deep(.n-progress-graph-line-fill) {
    transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>
