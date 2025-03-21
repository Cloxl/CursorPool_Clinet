<script setup lang="ts">
  import { NModal, NSpace, NIcon, useMessage } from 'naive-ui'
  import { useCursorStore } from '@/stores'
  import { watch } from 'vue'

  // 获取 Cursor Store
  const cursorStore = useCursorStore()
  // 获取消息组件
  const message = useMessage()

  // 监听文件选择状态变化，提供消息反馈
  watch(
    () => cursorStore.showSelectFileModal,
    (newValue) => {
      if (newValue) {
        // 模态框显示时重置错误
        cursorStore.fileSelectError = ''
      }
    },
  )

  // 处理文件选择
  const handleSelectPath = async () => {
    message.loading('正在选择文件...')
    await cursorStore.handleSelectCursorPath()

    // 处理成功状态
    if (!cursorStore.showSelectFileModal && !cursorStore.fileSelectError) {
      message.success('文件选择成功，系统已找到并保存Cursor路径')

      // 检查是否有待处理操作
      if (cursorStore.pendingAction) {
        message.loading(`正在执行${cursorStore.pendingAction.type}操作...`)

        // 等待操作完成
        setTimeout(() => {
          if (!cursorStore.fileSelectError) {
            if (cursorStore.pendingAction?.type === 'applyHook') {
              message.success('Hook应用成功！')
            } else if (cursorStore.pendingAction?.type === 'restoreHook') {
              message.success('Hook恢复成功！')
            }
          }
        }, 1000)
      }
    } else if (cursorStore.fileSelectError) {
      // 显示错误消息
      message.error(cursorStore.fileSelectError)
    }
  }
</script>

<template>
  <!-- 文件选择模态框 -->
  <n-modal
    v-model:show="cursorStore.showSelectFileModal"
    preset="dialog"
    title="选择Cursor程序或main.js文件"
    :show-icon="true"
    negative-text="取消"
    positive-text="选择文件"
    :positive-button-props="{
      loading: cursorStore.fileSelectLoading,
    }"
    style="width: 500px"
    @positive-click="handleSelectPath"
    @negative-click="
      () => {
        cursorStore.showSelectFileModal = false
      }
    "
  >
    <n-space vertical>
      <div>找不到Cursor的main.js文件，请选择以下文件之一：</div>
      <div style="margin-top: 10px; color: #0070c0">
        <ul style="list-style-type: none; padding-left: 0">
          <li style="margin-bottom: 5px">
            ✅
            <b>推荐：</b>
            选择Cursor程序文件(cursor.exe)
          </li>
          <li style="margin-bottom: 5px">✅ 直接选择main.js文件（如果您知道其位置）</li>
        </ul>
      </div>
      <div style="margin-top: 10px; color: #0070c0">
        <b>💡 提示：</b>
        您可以直接选择Cursor程序文件(cursor.exe)，系统会自动查找相关文件。
      </div>
      <div
        v-if="cursorStore.fileSelectError"
        style="
          color: red;
          margin-top: 10px;
          padding: 10px;
          background-color: #fff0f0;
          border-radius: 4px;
        "
      >
        <n-icon style="margin-right: 6px">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path
              d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
            />
          </svg>
        </n-icon>
        {{ cursorStore.fileSelectError }}
      </div>
    </n-space>
  </n-modal>
</template>
