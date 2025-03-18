<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { 
  NCard, 
  NSpace, 
  NForm, 
  NFormItem, 
  NInput, 
  NButton,
  NInputGroup,
  useMessage,
  NSpin
} from 'naive-ui'
import { useI18n } from '../locales'
import { messages } from '../locales/messages'
import LanguageSwitch from '../components/LanguageSwitch.vue'
import InboundSelector from '../components/InboundSelector.vue'
import CursorRunningModal from '../components/CursorRunningModal.vue'
import { 
  changePassword, 
  activate, 
  checkCursorRunning,
  applyHook,
  restoreHook,
} from '@/api'
import { addHistoryRecord } from '../utils/history'
import { version } from '../../package.json'
import { useUserStore } from '../stores/user'
import { useCursorStore } from '../stores'
import FileSelectModal from '../components/FileSelectModal.vue'
import { useRouter } from 'vue-router'

const message = useMessage()
const { currentLang, i18n } = useI18n()
const userStore = useUserStore()
const cursorStore = useCursorStore()
const router = useRouter()

interface SettingsForm {
  activationCode: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

const formValue = ref<SettingsForm>({
  activationCode: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 修改控制状态
const controlStatus = ref({
  isHooked: false,
  isChecking: false
})

// 为每个操作添加单独的加载状态
const applyHookLoading = ref(false)
const restoreHookLoading = ref(false)

const showControlRunningModal = ref(false)
const pendingControlAction = ref<'applyHook' | 'restoreHook' | null>(null)

// 为激活和修改密码添加独立的加载状态
const activateLoading = ref(false)
const passwordChangeLoading = ref(false)

const handleActivate = async () => {
  if (!formValue.value.activationCode) {
    message.error('请输入激活码')
    return
  }
  
  activateLoading.value = true
  try {
    await activate(formValue.value.activationCode)
    message.success('激活成功')
    addHistoryRecord(
      '激活码兑换',
      '成功兑换激活码'
    )
    formValue.value.activationCode = ''
    
    // 激活成功后跳转到 dashboard 页面
    router.push('/dashboard')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '激活失败')
  } finally {
    activateLoading.value = false
  }
}

const handleChangePassword = async () => {
  if (!formValue.value.currentPassword || !formValue.value.newPassword || !formValue.value.confirmPassword) {
    message.error('请填写完整密码信息')
    return
  }
  
  if (formValue.value.newPassword !== formValue.value.confirmPassword) {
    message.error('两次输入的新密码不一致')
    return
  }
  if (!validatePassword(formValue.value.newPassword)) {
    message.error('密码格式不正确')
    return
  }
  passwordChangeLoading.value = true
  try {
    await changePassword(
      formValue.value.currentPassword,
      formValue.value.newPassword
    )
    message.success('密码修改成功')
    
    formValue.value.currentPassword = ''
    formValue.value.newPassword = ''
    formValue.value.confirmPassword = ''
    
    await handleLogout()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '密码修改失败')
  } finally {
    passwordChangeLoading.value = false
  }
}

const handleLogout = async () => {
  try {
    await userStore.logout()
    addHistoryRecord('用户操作', '用户登出')
  } catch (error) {
    message.error('登出失败')
  }
}

// 修改 handleControlAction 函数
const handleControlAction = async (action: 'applyHook' | 'restoreHook', force_kill: boolean = false) => {
  // 根据操作设置对应的加载状态
  const loadingRef = {
    'applyHook': applyHookLoading,
    'restoreHook': restoreHookLoading
  }[action]

  try {
    loadingRef.value = true
    if (!force_kill) {
      const isRunning = await checkCursorRunning()
      if (isRunning) {
        showControlRunningModal.value = true
        pendingControlAction.value = action
        return
      }
    }

    try {
      let successMessage = ''
      let historyAction = ''
      
      switch (action) {
        case 'applyHook':
          await applyHook(force_kill)
          successMessage = messages[currentLang.value].systemControl.messages.applyHookSuccess
          historyAction = messages[currentLang.value].systemControl.history.applyHook
          controlStatus.value.isHooked = true
          break
        case 'restoreHook':
          await restoreHook(force_kill)
          successMessage = messages[currentLang.value].systemControl.messages.restoreHookSuccess
          historyAction = messages[currentLang.value].systemControl.history.restoreHook
          controlStatus.value.isHooked = false
          break
      }

      message.success(successMessage)
      showControlRunningModal.value = false
      addHistoryRecord('系统控制', historyAction)
      
      // 操作完成后重新检查状态
      await checkControlStatus()
    } catch (error) {
      // 获取完整的错误信息
      const errorMsg = error instanceof Error ? error.message : String(error)
      
      // 检查是否包含MAIN_JS_NOT_FOUND
      if (errorMsg.includes('MAIN_JS_NOT_FOUND')) {
        cursorStore.setPendingAction(action, { forceKill: force_kill })
        return
      }
      throw error
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('控制操作错误:', errorMsg)
    message.error(errorMsg)
  } finally {
    loadingRef.value = false
  }
}

// 检查控制状态
const checkControlStatus = async () => {
  try {
    // 添加loading状态
    controlStatus.value.isChecking = true
    
    // 使用cursorStore的checkHook方法，保持状态同步
    const hookResult = await cursorStore.checkHook()
    // 处理可能为null的情况
    controlStatus.value.isHooked = hookResult === true
    
    // 确保UI反映最新状态
    await nextTick()
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('检查控制状态失败:', errorMsg)
  } finally {
    // 完成检查，移除loading状态
    controlStatus.value.isChecking = false
  }
}

// 处理强制关闭
const handleControlForceKill = async () => {
  if (pendingControlAction.value) {
    await handleControlAction(pendingControlAction.value, true)
  }
}

// 监听cursorStore的hookStatus变化
watch(() => cursorStore.hookStatus, (newStatus) => {
  if (newStatus !== null) {
    controlStatus.value.isHooked = newStatus
  }
}, { immediate: true })

// 监听文件选择模态框的显示状态
watch(() => cursorStore.showSelectFileModal, (newValue, oldValue) => {
  if (oldValue && !newValue) {
    checkControlStatus()
  }
})

const validatePassword = (value: string): boolean => {
  return /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{6,20}$/.test(value)
}

// 在组件挂载时检查控制状态
onMounted(async () => {
  // 初始化状态
  controlStatus.value = {
    isHooked: cursorStore.hookStatus ?? false,
    isChecking: false
  }
  
  // 检查Hook状态
  await checkControlStatus()
})
</script>

<template>
  <n-space vertical :size="24">
    <!-- 系统设置卡片 -->
    <n-card :title="i18n.systemControl ? i18n.systemControl.title : '系统设置'">
      <n-space vertical :size="16">
        <!-- Hook 控制部分 -->
        <div>
          <div class="section-header">{{ i18n.systemControl.hookStatus }}</div>
          <n-space justify="space-between" align="center">
            <span>
              <template v-if="controlStatus.isChecking">
                <n-spin size="small" />
              </template>
              <template v-else>
                {{ controlStatus.isHooked ? i18n.systemControl.hookApplied : i18n.systemControl.hookNotApplied }}
              </template>
            </span>
            <n-space>
              <n-button 
                type="warning" 
                :loading="applyHookLoading || controlStatus.isChecking"
                :disabled="controlStatus.isHooked"
                @click="handleControlAction('applyHook')"
                style="width: 120px"
              >
                {{ i18n.systemControl.applyHook }}
              </n-button>
              <n-button 
                type="primary"
                :loading="restoreHookLoading || controlStatus.isChecking"
                :disabled="!controlStatus.isHooked"
                @click="handleControlAction('restoreHook')"
                style="width: 120px"
              >
                {{ i18n.systemControl.restoreHook }}
              </n-button>
            </n-space>
          </n-space>
        </div>
        
        <!-- 全局偏好设置 -->
        <div class="section-divider"></div>
        <div>
          <div class="section-header">全局偏好设置</div>
          <div class="preferences-list">
            <!-- 线路选择 -->
            <div class="preference-row">
              <div class="preference-label">{{ i18n.inbound ? i18n.inbound.title : '线路' }}</div>
              <div class="preference-control">
                <inbound-selector :show-label="false" />
              </div>
            </div>
            
            <!-- 语言选择 -->
            <div class="preference-row">
              <div class="preference-label">语言</div>
              <div class="preference-control">
                <language-switch :show-label="false" />
              </div>
            </div>
          </div>
        </div>
      </n-space>
    </n-card>

    <!-- 用户设置卡片 -->
    <n-card :title="messages[currentLang].settings.activation">
      <n-space vertical :size="16">
        <!-- 激活码部分 -->
        <div>
          <n-form
            :model="formValue"
            label-placement="left"
            label-width="120"
            require-mark-placement="right-hanging"
            class="activation-form"
          >
            <n-form-item
              :label="messages[currentLang].settings.activationCode"
              path="activationCode"
            >
              <n-input-group style="width: 360px">
                <n-input
                  v-model:value="formValue.activationCode"
                  :placeholder="messages[currentLang].settings.activationCode"
                  size="large"
                />
                <n-button
                  type="primary"
                  @click="handleActivate"
                  :loading="activateLoading"
                  size="large"
                >
                  {{ messages[currentLang].settings.activate }}
                </n-button>
              </n-input-group>
            </n-form-item>
          </n-form>
        </div>

        <!-- 密码修改部分 -->
        <div class="section-divider"></div>
        <div>
          <div class="section-header">{{ messages[currentLang].settings.changePassword }}</div>
          <n-form
            :model="formValue"
            label-placement="left"
            label-width="100"
            require-mark-placement="right-hanging"
            class="password-form"
          >
            <n-form-item :label="messages[currentLang].settings.currentPassword">
              <n-input
                v-model:value="formValue.currentPassword"
                type="password"
                show-password-on="click"
                :placeholder="messages[currentLang].settings.currentPassword"
                maxlength="20"
                minlength="6"
              />
            </n-form-item>

            <n-form-item :label="messages[currentLang].settings.newPassword">
              <n-input
                v-model:value="formValue.newPassword"
                type="password"
                show-password-on="click"
                :placeholder="messages[currentLang].settings.newPassword"
                maxlength="20"
                minlength="6"
              />
            </n-form-item>

            <n-form-item :label="messages[currentLang].settings.confirmPassword">
              <n-input
                v-model:value="formValue.confirmPassword"
                type="password"
                show-password-on="click"
                :placeholder="messages[currentLang].settings.confirmPassword"
                maxlength="20"
                minlength="6"
              />
            </n-form-item>

            <div style="margin-top: 12px">
              <n-space>
                <n-button 
                  type="primary" 
                  @click="handleChangePassword"
                  :loading="passwordChangeLoading"
                >
                  {{ messages[currentLang].settings.changePassword }}
                </n-button>
                <n-button
                  type="error"
                  @click="handleLogout"
                >
                  {{ i18n.common.logout }}
                </n-button>
              </n-space>
            </div>
          </n-form>
        </div>
      </n-space>
    </n-card>

    <!-- 关于信息卡片 -->
    <n-card :title="messages[currentLang].settings.about">
      <n-space vertical :size="12">
        <p>{{ i18n.about.appName }} v{{ version }}</p>
        <p>
          {{ i18n.about.copyright }} © {{ new Date().getFullYear() }} 
          <n-button text tag="a" href="https://github.com/Sanyela" target="_blank">Sanyela</n-button> & 
          <n-button text tag="a" href="https://github.com/Cloxl" target="_blank">Cloxl</n-button>
        </p>
        <p>{{ i18n.about.license }}</p>
      </n-space>
    </n-card>

    <cursor-running-modal
      v-model:show="showControlRunningModal"
      :title="i18n.common.cursorRunning"
      :content="i18n.common.cursorRunningMessage"
      :confirm-button-text="i18n.common.forceClose"
      @confirm="handleControlForceKill"
    />

    <!-- 添加文件选择模态框组件 -->
    <file-select-modal />
  </n-space>
</template>

<style scoped>
.section-divider {
  height: 1px;
  background-color: var(--n-border-color);
  margin: 12px 0;
}

.section-header {
  font-size: 16px;
  font-weight: 500;
  color: var(--n-title-text-color);
  margin-bottom: 12px;
}

.preferences-container {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.preference-group {
  display: flex;
  flex-direction: column;
  width: 48%;
}

.preference-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.preference-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
  width: 80px;
}

.preference-control {
  flex: 1;
}

@media (max-width: 600px) {
  .preferences-container {
    flex-direction: column;
    gap: 16px;
  }
  
  .preference-group {
    width: 100%;
  }
}

.hook-status-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.hook-status-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
  margin-right: 8px;
}

.hook-status-value {
  flex: 1;
}

.hook-status-actions {
  margin-left: auto;
}

/* 激活码表单样式 */
.activation-form :deep(.n-form-item-label) {
  text-align: left;
}

/* 确保标签文本左对齐 */
.activation-form :deep(.n-form-item-label__text) {
  text-align: left;
  justify-content: flex-start;
}

/* 密码表单样式 */
.password-form :deep(.n-form-item-label) {
  text-align: left;
}

/* 确保标签文本左对齐 */
.password-form :deep(.n-form-item-label__text) {
  text-align: left;
  justify-content: flex-start;
}
</style>