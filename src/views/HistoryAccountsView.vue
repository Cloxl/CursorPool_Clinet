<script setup lang="ts">
  import { ref, onMounted, h } from 'vue'
  import { useMessage } from 'naive-ui'
  import type { DataTableColumns } from 'naive-ui'
  import { NDataTable, NSpace, NButton, NCard, NProgress } from 'naive-ui'
  import type { HistoryAccount } from '@/types/history'
  import type { PendingForceKillAction } from '@/types/dashboard'
  import { useHistoryStore } from '@/stores/history'
  import { useCursorStore } from '@/stores/cursor'
  import CursorRunningModal from '../components/CursorRunningModal.vue'
  import { useI18n } from '../locales'

  const message = useMessage()
  const historyStore = useHistoryStore()
  const cursorStore = useCursorStore()
  const { i18n } = useI18n()

  // 模态框状态
  const showCursorRunningModal = ref(false)
  const pendingAccount = ref<HistoryAccount | null>(null)

  // 计算使用率
  const calculateUsagePercent = (count: number, maxUsage: number | null | undefined) => {
    // 确保count是数字
    if (typeof count === 'string') {
      count = parseInt(count, 10) || 0
    }

    // 确保count为非负数
    count = Math.max(0, count || 0)

    // 确保maxUsage是有效数字且不为0
    if (maxUsage === undefined || maxUsage === null || maxUsage <= 0 || isNaN(Number(maxUsage))) {
      maxUsage = count > 150 ? count : 150 // 默认值150与API返回的常见值一致
    } else {
      maxUsage = Number(maxUsage)
    }

    // 计算百分比并取整
    const percent = (count / maxUsage) * 100
    return Math.round(Math.min(percent, 100))
  }

  const columns: DataTableColumns<HistoryAccount> = [
    {
      title: '邮箱',
      key: 'email',
    },
    {
      title: '机器码',
      key: 'machineCode',
      render(row) {
        const code = row.machineCode
        return code.slice(0, 4) + '**' + code.slice(-4)
      },
    },
    {
      title: '高级模型使用量',
      key: 'gpt4Count',
      width: 150,
      render(row) {
        const percent = calculateUsagePercent(row.gpt4Count, row.gpt4MaxUsage)
        const color = percent >= 90 ? 'error' : percent >= 70 ? 'warning' : 'success'

        return h(NProgress, {
          type: 'line',
          percentage: percent,
          status: color,
          indicatorPlacement: 'inside',
          height: 12,
          showIndicator: false,
        })
      },
    },
    {
      title: '操作',
      key: 'actions',
      render(row) {
        return h(NSpace, null, {
          default: () => [
            h(
              NButton,
              {
                size: 'small',
                loading: historyStore.switchingAccount[row.email] || false,
                onClick: () => handleSwitch(row),
              },
              {
                default: () => '切换',
              },
            ),
            h(
              NButton,
              {
                size: 'small',
                type: 'error',
                loading: historyStore.deletingAccount[row.email] || false,
                onClick: () => handleRemove(row),
              },
              {
                default: () => '删除',
              },
            ),
          ],
        })
      },
    },
  ]

  async function handleSwitch(account: HistoryAccount) {
    try {
      const result = await cursorStore.switchToHistoryAccount(account)

      if (result.status === 'running') {
        pendingAccount.value = account
        showCursorRunningModal.value = true
        return
      }

      if (result.status === 'hook_failed') {
        message.error('注入失败，请手动注入后再试')
        return
      }

      if (result.status === 'success') {
        message.success('切换账户成功')
        window.location.reload()
      }
    } catch (error) {
      message.error('切换账户失败')
      console.error('切换账户失败:', error)
    }
  }

  async function handleRemove(account: HistoryAccount) {
    try {
      await historyStore.removeHistoryAccountItem(account.email)
      message.success('删除成功')
    } catch (error) {
      message.error('删除失败')
      console.error('删除账户失败:', error)
    }
  }

  async function handleClearHighUsageAccounts() {
    if (historyStore.highUsageAccounts.length === 0) {
      message.info('没有高使用量账户需要清理')
      return
    }

    try {
      const result = await historyStore.clearHighUsageAccounts()
      message.success(`成功清理 ${result.success} 个高使用量账户`)
    } catch (error) {
      message.error('清理高使用量账户失败')
      console.error('清理高使用量账户失败:', error)
    }
  }

  async function refreshUsage() {
    try {
      const result = await historyStore.refreshAccountsUsage()

      if (result.success === result.total) {
        message.success('所有账户刷新成功')
      } else {
        message.warning(`成功刷新 ${result.success}/${result.total} 个账户`)
      }
    } catch (error) {
      message.error('刷新使用情况失败')
      console.error('刷新使用情况失败:', error)
    }
  }

  const handleForceKill = async () => {
    if (!pendingAccount.value) return

    try {
      showCursorRunningModal.value = false
      const account = pendingAccount.value

      // 使用 store 中的方法
      const result = await cursorStore.forceCloseAndSwitch(account)

      if (result.status === 'hook_failed') {
        message.error('注入失败，请手动注入后再试')
        return
      }

      if (result.status === 'success') {
        message.success('切换账户成功')
        window.location.reload()
      }
    } catch (error) {
      message.error('切换账户失败')
      console.error('切换账户失败:', error)
    } finally {
      pendingAccount.value = null
    }
  }

  onMounted(async () => {
    try {
      await historyStore.fetchHistoryAccounts(false)
    } catch (error) {
      console.error('加载历史账户失败:', error)
      message.error('加载历史账户失败')
    }

    window.addEventListener('force_kill_cursor', async (e: Event) => {
      const detail = (e as CustomEvent).detail as PendingForceKillAction
      if (detail.type === 'account') {
        await handleForceKill()
      }
    })
  })
</script>

<template>
  <n-space vertical :size="24">
    <n-card title="历史账户">
      <template #header-extra>
        <n-space>
          <n-button :loading="historyStore.loadingAccounts" type="primary" @click="refreshUsage">
            刷新所有账户
          </n-button>
          <n-button
            :loading="historyStore.clearingHighUsage"
            type="error"
            :disabled="historyStore.highUsageAccounts.length === 0"
            @click="handleClearHighUsageAccounts"
          >
            清理高使用量账户 ({{ historyStore.highUsageAccounts.length }})
          </n-button>
        </n-space>
      </template>
      <n-data-table
        :columns="columns"
        :data="historyStore.filteredHistoryAccounts"
        :loading="historyStore.loadingAccounts"
        :bordered="false"
        :pagination="{
          pageSize: 10,
        }"
      />
    </n-card>
  </n-space>

  <cursor-running-modal
    v-model:show="showCursorRunningModal"
    :title="i18n.common.cursorRunning"
    :content="i18n.common.cursorRunningMessage"
    :confirm-button-text="i18n.common.forceClose"
    @confirm="handleForceKill"
  />
</template>
