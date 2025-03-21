<script setup lang="ts">
  import { NModal, NRadioGroup, NRadio, NSpace, NFormItem, useMessage, NCheckbox } from 'naive-ui'
  import { useAppCloseStore } from '@/stores'

  const message = useMessage()
  const appCloseStore = useAppCloseStore()

  // 处理确认按钮点击
  const handleConfirm = async () => {
    try {
      await appCloseStore.confirmClose()
    } catch (error) {
      message.error('操作失败，请重试')
    }
  }
</script>

<template>
  <n-modal
    v-model:show="appCloseStore.showConfirmModal"
    preset="dialog"
    title="关闭确认"
    positive-text="确认"
    negative-text="取消"
    :mask-closable="false"
    @positive-click="handleConfirm"
    @negative-click="appCloseStore.cancelClose"
  >
    <div style="margin-bottom: 12px">请选择关闭方式：</div>

    <n-form-item>
      <n-radio-group v-model:value="appCloseStore.closeType">
        <n-space vertical>
          <n-radio value="minimize">最小化到系统托盘</n-radio>
          <n-radio value="exit">退出程序</n-radio>
        </n-space>
      </n-radio-group>
    </n-form-item>

    <n-form-item>
      <n-checkbox v-model:checked="appCloseStore.savePreference">记住我的选择</n-checkbox>
    </n-form-item>
  </n-modal>
</template>
