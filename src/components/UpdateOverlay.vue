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
  <div class="fixed inset-0 flex-center bg-black/65 backdrop-blur-md z-1000 select-none">
    <n-card class="w-460px max-w-90% rounded-lg shadow-lg">
      <div class="py-2 flex flex-col items-center">
        <div v-if="showSpinner" class="mb-4">
          <n-spin size="large" />
        </div>

        <div class="text-base mb-4 text-center">
          {{ statusText }}
        </div>

        <n-space vertical class="w-full mb-2">
          <n-progress
            type="line"
            :percentage="updaterStore.progressPercentage"
            :color="progressColor"
            :height="20"
            :processing="updaterStore.isDownloading"
            indicator-placement="inside"
          />
        </n-space>

        <div v-if="updaterStore.isDownloading" class="text-xs text-$n-text-color-3 mt-1">
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
