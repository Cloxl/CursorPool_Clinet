<script setup lang="ts">
  import { ref, computed, onMounted, watch } from 'vue'
  import { NSelect, useMessage, useDialog } from 'naive-ui'
  import type { SelectOption } from 'naive-ui'
  import { useInboundStore } from '../stores/inbound'
  import { useI18n } from '../locales'
  import { relaunch } from '@tauri-apps/plugin-process'

  const props = defineProps({
    // 是否在紧凑布局中使用（如登录页面）
    compact: {
      type: Boolean,
      default: false,
    },
    // 是否显示标签
    showLabel: {
      type: Boolean,
      default: true,
    },
    // 是否隐藏标签内容（仅显示图标）
    iconOnly: {
      type: Boolean,
      default: false,
    },
  })

  // 状态
  const { t } = useI18n()
  const message = useMessage()
  const dialog = useDialog()
  const inboundStore = useInboundStore()
  const selectedInbound = ref(inboundStore.currentInboundIndex)

  // 计算属性
  const selectOptions = computed<SelectOption[]>(() => {
    return inboundStore.inboundList.map((item, index) => ({
      label: item.name,
      value: index,
      key: index,
    }))
  })

  // 选择线路
  async function handleSelect(index: number) {
    if (selectedInbound.value === index) return

    // 记录原始选择
    const originalIndex = selectedInbound.value

    // 先尝试调用切换函数，保存到后端
    const result = await inboundStore.switchInbound(index)

    if (result) {
      // 成功后再更新本地UI状态
      selectedInbound.value = index

      message.success(
        t('inbound.switchSuccess', {
          name: inboundStore.inboundList[index].name,
        }),
      )
      // 提示用户重启应用
      dialog.info({
        title: t('inbound.title'),
        content: t('inbound.restartNeeded'),
        positiveText: t('common.confirmRestart'),
        closable: false,
        maskClosable: false,
        async onPositiveClick() {
          try {
            await relaunch()
            return false
          } catch (error) {
            console.error('重启应用失败:', error)
            return false
          }
        },
      })
    } else {
      message.error(t('inbound.switchFailed'))
      // 保持原来的选择
      selectedInbound.value = originalIndex
    }
  }

  // 监听store中的当前选择变化
  watch(
    () => inboundStore.currentInboundIndex,
    (newIndex) => {
      selectedInbound.value = newIndex
    },
  )

  // 组件挂载时获取线路列表
  onMounted(async () => {
    if (inboundStore.inboundList.length === 0) {
      await inboundStore.fetchInboundList()
    }
    // 同步选择
    selectedInbound.value = inboundStore.currentInboundIndex
  })
</script>

<template>
  <div
    class="inbound-selector"
    :class="{
      compact: props.compact,
      'icon-only': props.iconOnly,
    }"
  >
    <!-- 标签 -->
    <div v-if="showLabel && !iconOnly" class="selector-label">
      {{ t('inbound.title') }}
    </div>

    <!-- 紧凑模式 - 下拉选择 -->
    <n-select
      v-if="compact"
      :value="selectedInbound"
      :options="selectOptions"
      :disabled="inboundStore.isLoading"
      :loading="inboundStore.isLoading"
      size="small"
      :style="{ width: '100px' }"
      :placeholder="t('inbound.selector')"
      @update:value="handleSelect"
    />

    <!-- 展开模式 - 带背景的选择器 -->
    <div v-else class="selector-container">
      <n-select
        :value="selectedInbound"
        :options="selectOptions"
        :disabled="inboundStore.isLoading"
        :loading="inboundStore.isLoading"
        size="small"
        :style="{
          width: iconOnly ? 'auto' : '120px',
        }"
        :placeholder="t('inbound.selector')"
        @update:value="handleSelect"
      />
    </div>
  </div>
</template>

<style scoped>
  .inbound-selector {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .selector-label {
    font-size: 14px;
    white-space: nowrap;
  }

  .selector-container {
    background-color: var(--n-color-hover, rgba(0, 0, 0, 0.05));
    padding: 0;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: all 0.2s;
  }

  .compact {
    gap: 0;
  }

  .icon-only .selector-container {
    padding: 0;
  }

  /* 暗色主题适配 */
  :root[data-theme='dark'] .selector-container {
    background-color: var(--n-color-hover, rgba(255, 255, 255, 0.1));
  }

  :deep(.n-select .n-base-selection) {
    background-color: transparent;
    height: 28px;
  }

  :deep(.n-base-selection-label) {
    padding: 0 !important;
  }

  :deep(.n-base-selection__border) {
    border: none !important;
  }
</style>
