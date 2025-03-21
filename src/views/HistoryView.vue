<script setup lang="ts">
  import { ref, onMounted, onUnmounted, computed } from 'vue'
  import { NCard, NDataTable, NSpace, NDatePicker, NButton, useMessage } from 'naive-ui'
  import type { DataTableColumns } from 'naive-ui'
  import { useI18n } from '../locales'
  import { messages } from '../locales/messages'
  import type { OperationRecord } from '../types/history'
  import { useHistoryStore } from '../stores/history'
  import { clearHistoryRecords } from '../api'

  const { currentLang, i18n } = useI18n()
  const message = useMessage()
  const historyStore = useHistoryStore()

  const dateRange = ref<[number, number] | null>(null)
  const isLoading = ref(false)

  // 清除历史记录
  const clearHistory = async () => {
    try {
      isLoading.value = true
      // 使用专门的清除历史记录API
      await clearHistoryRecords()
      // 重新加载历史记录
      await historyStore.loadHistoryRecords()
      message.success(i18n.value.history.clearSuccess)
    } catch (error) {
      message.error(i18n.value.history.clearFailed)
      console.error('清除历史记录失败:', error)
    } finally {
      isLoading.value = false
    }
  }

  // 组件挂载时加载历史记录
  onMounted(async () => {
    isLoading.value = true
    try {
      await historyStore.loadHistoryRecords()
    } catch (error) {
      console.error('加载历史记录失败:', error)
      message.error('加载历史记录失败')
    } finally {
      isLoading.value = false
    }
  })

  // 监听历史记录更新事件
  const handleHistoryUpdate = async () => {
    await historyStore.loadHistoryRecords()
  }

  onMounted(() => {
    window.addEventListener('history_updated', handleHistoryUpdate)
  })

  onUnmounted(() => {
    window.removeEventListener('history_updated', handleHistoryUpdate)
  })

  // 根据日期范围过滤历史记录
  const filteredRecords = computed(() => {
    if (!dateRange.value) {
      return historyStore.sortedRecords
    }

    const [startTime, endTime] = dateRange.value
    // 将结束日期调整到当天的23:59:59
    const endOfDay = new Date(endTime)
    endOfDay.setHours(23, 59, 59, 999)

    return historyStore.sortedRecords.filter((record) => {
      const recordTime = new Date(record.timestamp).getTime()
      return recordTime >= startTime && recordTime <= endOfDay.getTime()
    })
  })

  const columns: DataTableColumns<OperationRecord> = [
    {
      title: () => messages[currentLang.value].history.type,
      key: 'type',
    },
    {
      title: () => messages[currentLang.value].history.detail,
      key: 'detail',
    },
    {
      title: () => messages[currentLang.value].history.time,
      key: 'timestamp',
      sorter: 'default',
      render: (row) => {
        const date = new Date(row.timestamp)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`
      },
    },
    {
      title: () => messages[currentLang.value].history.operator,
      key: 'operator',
    },
  ]
</script>

<template>
  <n-space vertical :size="24">
    <n-card :title="messages[currentLang].history.filter">
      <n-space justify="space-between">
        <n-date-picker
          v-model:value="dateRange"
          type="daterange"
          clearable
          :placeholder="i18n.history.datePlaceholder"
        />
        <n-button
          type="error"
          :loading="isLoading"
          :disabled="historyStore.sortedRecords.length === 0"
          @click="clearHistory"
        >
          {{ i18n.history.clearHistory }}
        </n-button>
      </n-space>
    </n-card>

    <n-card :title="messages[currentLang].history.title">
      <n-data-table
        :columns="columns"
        :data="filteredRecords"
        :bordered="false"
        :loading="isLoading || historyStore.isLoading"
        :pagination="{
          pageSize: 10,
        }"
      />
    </n-card>
  </n-space>
</template>
