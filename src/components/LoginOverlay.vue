<script setup lang="ts">
  import { ref, reactive, computed, watch } from 'vue'
  import {
    NCard,
    NForm,
    NFormItem,
    NInput,
    NButton,
    useMessage,
    NSpace,
    NAutoComplete,
    NTag,
    NModal,
    NTabs,
    NTabPane,
    NInputGroup,
  } from 'naive-ui'
  import { checkUser, sendCode } from '../api'
  import type { SelectOption } from 'naive-ui'
  import { h } from 'vue'
  import { useI18n } from '../locales'
  import { messages } from '../locales/messages'
  import { addHistoryRecord } from '../utils/history'
  import { useUserStore } from '../stores/user'
  import InboundSelector from './InboundSelector.vue'

  // 定义组件事件
  const emit = defineEmits(['login-success'])

  // 基础状态
  const message = useMessage()
  const { currentLang, t } = useI18n()
  const activeTab = ref('login')
  const userStore = useUserStore()

  // 忘记密码相关状态
  const showForgotPassword = ref(false)
  const forgotPasswordLoading = ref(false)
  const forgotPasswordCodeSending = ref(false)
  const forgotPasswordForm = ref({
    email: '',
    smsCode: '',
    newPassword: '',
    confirmPassword: '',
  })

  // 邮箱验证正则
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  // 邮箱提供商配置
  const emailProviders = [
    {
      label: 'Google',
      domain: 'gmail.com',
      color: 'error',
    },
    {
      label: '腾讯',
      domain: 'qq.com',
      color: 'success',
    },
    {
      label: '腾讯',
      domain: 'foxmail.com',
      color: 'success',
    },
    {
      label: '网易',
      domain: '163.com',
      color: 'warning',
    },
    {
      label: 'Microsoft',
      domain: 'outlook.com',
      color: 'info',
    },
  ]

  // 隐藏域名列表
  const hiddenValidDomains = ['cloxl.com', '52ai.org']

  /**
   * 表单状态管理
   */
  const formState = reactive({
    // 登录表单
    login: {
      username: '',
      password: '',
      loading: false,
      error: '',
    },

    // 注册表单
    register: {
      password: '',
      confirmPassword: '',
      email: '',
      code: '',
      loading: false,
      error: '',
      codeSent: false,
      codeSending: false,
      countdown: 0,
    },
  })

  // 监听Pinia中的登录错误
  watch(
    () => userStore.loginError,
    (newError) => {
      if (newError) {
        if (activeTab.value === 'login') {
          message.error(newError)
        } else {
          message.error(newError)
        }
      }
    },
  )

  // 计算属性
  const canSendCode = computed(() => {
    return (
      formState.register.email &&
      formState.register.countdown === 0 &&
      !formState.register.codeSending
    )
  })

  const canRegister = computed(() => {
    return (
      formState.register.password &&
      formState.register.confirmPassword &&
      formState.register.email &&
      formState.register.code
    )
  })

  // 计算标题
  const formTitle = computed(() =>
    activeTab.value === 'login'
      ? messages[currentLang.value].login.title
      : messages[currentLang.value].login.registerButton,
  )

  // 渲染邮箱选项标签
  const renderLabel = (option: SelectOption) => {
    const domain = option.value?.toString().split('@')[1]
    const provider = emailProviders.find((p) => p.domain === domain)

    return [
      option.label as string,
      ' ',
      h(
        NTag,
        {
          size: 'small',
          type: (provider?.color || 'default') as
            | 'error'
            | 'success'
            | 'warning'
            | 'info'
            | 'default'
            | 'primary',
        },
        {
          default: () => provider?.label || '邮箱',
        },
      ),
    ]
  }

  // 邮箱自动完成选项 - 登录
  const loginEmailOptions = computed(() => {
    const inputValue = formState.login.username

    // 如果已经是完整的有效邮箱，不显示选项
    if (isValidEmail(inputValue)) {
      return []
    }

    const atIndex = inputValue.lastIndexOf('@')

    // 只有当用户输入@后才显示选项
    if (atIndex === -1) return []

    const username = inputValue.substring(0, atIndex)
    if (!username) return []

    return emailProviders.map((provider) => ({
      label: `${username}@${provider.domain}`,
      value: `${username}@${provider.domain}`,
    }))
  })

  // 邮箱自动完成选项 - 注册
  const registerEmailOptions = computed(() => {
    const inputValue = formState.register.email

    // 如果已经是完整的有效邮箱，不显示选项
    if (isValidEmail(inputValue)) {
      return []
    }

    const atIndex = inputValue.lastIndexOf('@')

    // 只有当用户输入@后才显示选项
    if (atIndex === -1) return []

    const username = inputValue.substring(0, atIndex)
    if (!username) return []

    return emailProviders.map((provider) => ({
      label: `${username}@${provider.domain}`,
      value: `${username}@${provider.domain}`,
    }))
  })

  // 验证邮箱格式
  function isValidEmail(email: string): boolean {
    if (!emailRegex.test(email)) return false
    const domain = email.split('@')[1]
    return (
      emailProviders.some((provider) => provider.domain === domain) ||
      hiddenValidDomains.includes(domain)
    )
  }

  // 检查邮箱后缀是否有效
  function checkEmailDomain(email: string): 'error' | 'warning' | undefined {
    if (!email) return undefined
    if (!emailRegex.test(email)) return 'error'

    const domain = email.split('@')[1]
    if (
      domain &&
      !emailProviders.some((p) => p.domain === domain) &&
      !hiddenValidDomains.includes(domain)
    ) {
      return 'error'
    }
    return undefined
  }

  // 登录邮箱状态
  const loginEmailStatus = computed(() => checkEmailDomain(formState.login.username))

  // 注册邮箱状态
  const registerEmailStatus = computed(() => checkEmailDomain(formState.register.email))

  // 忘记密码邮箱状态
  const forgotPasswordEmailStatus = computed(() => checkEmailDomain(forgotPasswordForm.value.email))

  /**
   * 表单验证
   */
  const validators = {
    // 密码验证
    validatePassword(value: string): boolean {
      // eslint-disable-next-line no-useless-escape
      return /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{6,20}$/.test(value)
    },

    // 邮箱验证
    validateEmail(value: string): boolean {
      // eslint-disable-next-line no-useless-escape
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    },

    // 验证码验证
    validateCode(value: string): boolean {
      // eslint-disable-next-line no-useless-escape
      return /^\d{6}$/.test(value)
    },
  }

  /**
   * 处理登录
   */
  async function handleLogin() {
    const { username, password } = formState.login

    // 表单验证
    if (!username || !password) {
      message.error('请填写完整的登录信息')
      return
    }

    if (!validators.validateEmail(username)) {
      message.error('邮箱格式不正确')
      return
    }

    if (!validators.validatePassword(password)) {
      message.error('密码格式不正确，请使用6-20位字母、数字或特殊字符')
      return
    }

    try {
      formState.login.loading = true
      formState.login.error = ''

      // 使用Pinia store的login方法
      await userStore.login(username, password, 'web')
      message.success('登录成功')
      addHistoryRecord('登录', `用户 ${username} 登录成功`)
      emit('login-success')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败')
    } finally {
      formState.login.loading = false
    }
  }

  /**
   * 处理发送验证码
   */
  async function handleSendCode(email: string, type: 'register' | 'reset' = 'register') {
    // 邮箱验证
    if (!email) {
      if (type === 'register') {
        message.error('请输入邮箱地址')
      } else {
        message.error('请输入邮箱地址')
      }
      return
    }

    if (!validators.validateEmail(email)) {
      if (type === 'register') {
        message.error('邮箱格式不正确')
      } else {
        message.error('邮箱格式不正确')
      }
      return
    }

    try {
      if (type === 'register') {
        formState.register.codeSending = true
        formState.register.error = ''

        // 检查用户是否已存在
        const result = await checkUser(email)
        if (result.msg === '已存在') {
          message.error('该邮箱已被注册')
          return
        }
      } else {
        forgotPasswordCodeSending.value = true
      }

      // 发送验证码 - 这个API调用保留，因为Pinia store中没有对应的方法
      await sendCode(email, type)
      message.success('验证码已发送')

      if (type === 'register') {
        formState.register.codeSent = true

        // 开始倒计时
        formState.register.countdown = 60
        const timer = setInterval(() => {
          formState.register.countdown--
          if (formState.register.countdown <= 0) {
            clearInterval(timer)
          }
        }, 1000)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '发送验证码失败'
      message.error(errorMsg)
    } finally {
      if (type === 'register') {
        formState.register.codeSending = false
      } else {
        forgotPasswordCodeSending.value = false
      }
    }
  }

  /**
   * 处理注册
   */
  async function handleRegister() {
    const { password, confirmPassword, email, code } = formState.register

    // 表单验证
    if (!password || !confirmPassword || !email || !code) {
      message.error('请填写完整的注册信息')
      return
    }

    if (!validators.validatePassword(password)) {
      message.error('密码格式不正确，请使用6-20位字母、数字或特殊字符')
      return
    }

    if (password !== confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    if (!validators.validateEmail(email)) {
      message.error('邮箱格式不正确')
      return
    }

    if (!validators.validateCode(code)) {
      message.error('验证码格式不正确')
      return
    }

    try {
      formState.register.loading = true
      formState.register.error = ''

      // 使用Pinia store的register方法
      const success = await userStore.register(email, code, password, 'web')
      message.success('注册成功')
      addHistoryRecord('注册', `用户 ${email} 注册成功`)

      // 注册成功，如果已登录直接触发登录成功事件
      if (success && userStore.isLoggedIn) {
        emit('login-success')
      } else {
        // 注册成功但未自动登录，切换到登录页
        activeTab.value = 'login'
        formState.login.username = email
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '注册失败')
    } finally {
      formState.register.loading = false
    }
  }

  /**
   * 处理忘记密码
   */
  async function handleForgotPassword() {
    if (
      !forgotPasswordForm.value.email ||
      !validators.validateEmail(forgotPasswordForm.value.email)
    ) {
      message.error('请输入有效的邮箱地址')
      return
    }

    if (!forgotPasswordForm.value.smsCode) {
      message.error('请输入验证码')
      return
    }

    if (!forgotPasswordForm.value.newPassword) {
      message.error('请输入新密码')
      return
    }

    if (forgotPasswordForm.value.newPassword !== forgotPasswordForm.value.confirmPassword) {
      message.error('两次输入的密码不一致')
      return
    }

    forgotPasswordLoading.value = true
    try {
      // 使用Pinia store的resetPassword方法
      await userStore.resetPassword(
        forgotPasswordForm.value.email,
        forgotPasswordForm.value.smsCode,
        forgotPasswordForm.value.newPassword,
      )
      message.success('密码重置成功')
      showForgotPassword.value = false
    } catch (error) {
      message.error(error instanceof Error ? error.message : '密码重置失败')
    } finally {
      forgotPasswordLoading.value = false
    }
  }
</script>

<template>
  <!-- 添加一个隐藏的假表单来欺骗浏览器的自动填充 -->
  <form style="display: none" aria-hidden="true">
    <input type="text" />
    <input type="email" />
    <input type="password" />
  </form>

  <div class="login-overlay">
    <n-card :title="formTitle" class="login-card">
      <n-tabs v-model:value="activeTab" type="line" animated class="full-width-tabs">
        <!-- 登录标签页 -->
        <n-tab-pane name="login" :tab="messages[currentLang].login.title">
          <n-form class="compact-form">
            <n-form-item>
              <n-auto-complete
                v-model:value="formState.login.username"
                :options="loginEmailOptions"
                :placeholder="messages[currentLang].login.emailPlaceholder"
                :render-label="renderLabel"
                :status="loginEmailStatus"
                maxlength="50"
                @keyup.enter="handleLogin"
              />
            </n-form-item>

            <n-form-item>
              <n-input
                v-model:value="formState.login.password"
                type="password"
                show-password-on="click"
                :placeholder="messages[currentLang].login.passwordPlaceholder"
                maxlength="20"
                @keyup.enter="handleLogin"
              />
            </n-form-item>

            <n-space justify="space-between">
              <n-space align="center">
                <n-button
                  type="primary"
                  block
                  :loading="formState.login.loading"
                  class="login-button"
                  @click="handleLogin"
                >
                  {{ messages[currentLang].login.loginButton }}
                </n-button>
                <inbound-selector compact :show-label="false" />
              </n-space>

              <n-button text @click="showForgotPassword = true">
                {{ t('common.forgotPassword') }}
              </n-button>
            </n-space>
          </n-form>
        </n-tab-pane>

        <!-- 注册标签页 -->
        <n-tab-pane name="register" :tab="messages[currentLang].login.registerButton">
          <n-form class="compact-form">
            <n-form-item>
              <n-auto-complete
                v-model:value="formState.register.email"
                :options="registerEmailOptions"
                :placeholder="messages[currentLang].login.emailPlaceholder"
                :render-label="renderLabel"
                :status="registerEmailStatus"
                maxlength="50"
              />
            </n-form-item>

            <n-form-item>
              <n-input-group>
                <n-input
                  v-model:value="formState.register.code"
                  :placeholder="messages[currentLang].login.smsCodePlaceholder"
                />
                <n-button
                  :disabled="!canSendCode || registerEmailStatus === 'error'"
                  :loading="formState.register.codeSending"
                  class="send-code-btn"
                  type="primary"
                  ghost
                  @click="handleSendCode(formState.register.email, 'register')"
                >
                  {{
                    formState.register.countdown > 0
                      ? messages[currentLang].login.resendCode.replace(
                          '{seconds}',
                          formState.register.countdown.toString(),
                        )
                      : messages[currentLang].login.sendCode
                  }}
                </n-button>
              </n-input-group>
            </n-form-item>

            <n-form-item>
              <n-input
                v-model:value="formState.register.password"
                type="password"
                show-password-on="click"
                :placeholder="messages[currentLang].login.passwordPlaceholder"
                maxlength="20"
              />
            </n-form-item>

            <n-form-item>
              <n-input
                v-model:value="formState.register.confirmPassword"
                type="password"
                show-password-on="click"
                placeholder="请再次输入密码"
                maxlength="20"
              />
            </n-form-item>

            <n-button
              type="primary"
              block
              :disabled="!canRegister"
              :loading="formState.register.loading"
              style="margin-top: 8px"
              @click="handleRegister"
            >
              {{ messages[currentLang].login.registerButton }}
            </n-button>
          </n-form>
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>

  <!-- 忘记密码模态框 -->
  <n-modal v-model:show="showForgotPassword">
    <n-card
      style="width: 400px"
      :title="messages[currentLang].login.loginButton === '登录' ? '重置密码' : 'Reset Password'"
    >
      <n-form class="compact-form">
        <n-form-item :label="messages[currentLang].login.emailPlaceholder">
          <n-auto-complete
            v-model:value="forgotPasswordForm.email"
            :options="loginEmailOptions"
            :placeholder="messages[currentLang].login.emailPlaceholder"
            :render-label="renderLabel"
            :status="forgotPasswordEmailStatus"
            :disabled="forgotPasswordLoading"
          />
        </n-form-item>

        <n-form-item :label="messages[currentLang].login.smsCodePlaceholder">
          <n-input-group>
            <n-input
              v-model:value="forgotPasswordForm.smsCode"
              :placeholder="messages[currentLang].login.smsCodePlaceholder"
              :disabled="forgotPasswordLoading"
            />
            <n-button
              :disabled="
                forgotPasswordLoading ||
                !validators.validateEmail(forgotPasswordForm.email) ||
                forgotPasswordEmailStatus === 'error'
              "
              class="send-code-btn"
              type="primary"
              ghost
              :loading="forgotPasswordCodeSending"
              @click="handleSendCode(forgotPasswordForm.email, 'reset')"
            >
              {{ messages[currentLang].login.sendCode }}
            </n-button>
          </n-input-group>
        </n-form-item>

        <n-form-item label="新密码">
          <n-input
            v-model:value="forgotPasswordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            :disabled="forgotPasswordLoading"
          />
        </n-form-item>

        <n-form-item label="确认密码">
          <n-input
            v-model:value="forgotPasswordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            :disabled="forgotPasswordLoading"
          />
        </n-form-item>

        <n-space justify="end">
          <n-button @click="showForgotPassword = false">
            {{ messages[currentLang].login.loginButton === '登录' ? '取消' : 'Cancel' }}
          </n-button>
          <n-button type="primary" :loading="forgotPasswordLoading" @click="handleForgotPassword">
            {{ messages[currentLang].login.loginButton === '登录' ? '重置密码' : 'Reset Password' }}
          </n-button>
        </n-space>
      </n-form>
    </n-card>
  </n-modal>
</template>

<style scoped>
  .login-overlay {
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

  .login-card {
    width: 360px;
    max-width: 90%;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  /* 标签页容器样式 */
  .full-width-tabs :deep(.n-tabs-wrapper) {
    display: flex;
    width: 100%;
  }

  /* 标签页包装器样式 */
  .full-width-tabs :deep(.n-tabs-tab-wrapper) {
    flex: 1;
    display: flex;
  }

  /* 标签页样式 */
  .full-width-tabs :deep(.n-tabs-tab) {
    flex: 1;
    display: flex;
    justify-content: center;
    font-size: 16px;
    padding: 0;
    margin: 0;
  }

  /* 激活的标签页样式 */
  .full-width-tabs :deep(.n-tabs-tab.n-tabs-tab--active) {
    font-weight: bold;
  }

  /* 隐藏标签页内的padding元素 */
  .full-width-tabs :deep(.n-tabs-tab-pad) {
    display: none !important;
    width: 0 !important;
  }

  /* 标签页内容区域样式 */
  .full-width-tabs :deep(.n-tabs-tab-pane) {
    padding-top: 12px;
  }

  /* 标签页下划线样式 */
  .full-width-tabs :deep(.n-tabs-bar) {
    width: 50% !important;
    transition: transform 0.3s var(--n-bezier);
  }

  /* 缩小输入框间距 */
  .compact-form :deep(.n-form-item) {
    margin-bottom: 5px;
  }

  .compact-form :deep(.n-form-item:last-child) {
    margin-bottom: 0;
  }

  /* 发送验证码按钮样式 */
  .send-code-btn {
    min-width: 100px;
    font-size: 13px;
    padding: 0 8px;
  }

  :deep(.n-card) {
    background: var(--n-color);
    color: var(--n-text-color);
  }

  :deep(.n-card-header) {
    text-align: center;
    font-size: 1.5em;
    padding-top: 14px;
    padding-bottom: 4px;
  }

  :deep(.n-card__content) {
    padding-top: 4px;
    padding-bottom: 14px;
  }

  :deep(.n-input) {
    user-select: text;
  }

  :deep(.n-input-wrapper) {
    user-select: text;
  }

  :deep(.n-form-item-feedback-wrapper) {
    min-height: 12px;
  }

  :deep(.n-form-item-feedback) {
    color: var(--n-feedback-text-color);
    font-size: 12px;
  }

  /* 添加以下样式来进一步防止自动填充 */
  :deep(.n-input__input-el) {
    /* 禁用 webkit 浏览器的自动填充样式 */
    &:-webkit-autofill,
    &:-webkit-autofill:hover,
    &:-webkit-autofill:focus,
    &:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 30px var(--n-color) inset !important;
      -webkit-text-fill-color: var(--n-text-color) !important;
      transition: background-color 5000s ease-in-out 0s;
    }
  }

  /* 自定义错误状态样式 */
  :deep(.n-auto-complete.n-auto-complete--status-error .n-input) {
    border-color: #ff4d4f;
  }

  :deep(.n-auto-complete.n-auto-complete--status-error:hover .n-input) {
    border-color: #ff7875;
  }

  :deep(.n-auto-complete.n-auto-complete--status-error:focus .n-input) {
    border-color: #ff7875;
    box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
  }

  /* 登录操作按钮区域 */
  .login-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
