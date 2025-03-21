<script setup lang="ts">
  import { ref, computed, watch, onUnmounted } from 'vue'
  import { driver, Driver } from 'driver.js'
  import type { DriveStep, Side } from 'driver.js'
  import 'driver.js/dist/driver.css'
  import { useAppStore } from '@/stores'

  // 引入appStore
  const appStore = useAppStore()

  // 接收props
  const props = defineProps<{
    show: boolean
    onComplete?: () => void
  }>()

  // 根据当前主题计算颜色
  const isDarkMode = computed(() => {
    return localStorage.getItem('theme-mode') === 'dark'
  })

  const themeColors = computed(() => {
    return isDarkMode.value
      ? {
          backgroundColor: '#1f1f1f',
          textColor: '#e0e0e0',
          titleColor: '#ffffff',
          buttonBgColor: '#18a058',
          buttonTextColor: '#ffffff',
          borderColor: '#444',
          highlightBgColor: 'rgba(24, 160, 88, 0.1)',
          popoverShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        }
      : {
          backgroundColor: '#ffffff',
          textColor: '#333333',
          titleColor: '#000000',
          buttonBgColor: '#18a058',
          buttonTextColor: '#ffffff',
          borderColor: '#e0e0e0',
          highlightBgColor: 'rgba(24, 160, 88, 0.05)',
          popoverShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }
  })

  // 引导步骤
  const tourSteps: Array<{
    element: string
    popover: {
      title: string
      description: string
      side: Side
      align: string
    }
  }> = [
    {
      element: '.user-info-card',
      popover: {
        title: '用户信息',
        description: '当前设备本地所有账户的信息',
        side: 'right' as Side,
        align: 'start',
      },
    },
    {
      element: '.user-info-username',
      popover: {
        title: 'CP 账户信息',
        description: '当前账户的Cursor Pool账户名称和会员等级, CP是Cursor Pool的缩写',
        side: 'right' as Side,
        align: 'start',
      },
    },
    {
      element: '.user-info-email',
      popover: {
        title: 'Cursor 邮箱',
        description:
          '本地Cursor账户的邮箱, 也就是正在使用的账户, 不是Cursor Pool的邮箱, 如果未显示, 说明本地Cursor未登录或者掉登录',
        side: 'right' as Side,
        align: 'start',
      },
    },
    {
      element: '.user-info-cc-status',
      popover: {
        title: 'CC 注入状态',
        description: '本地Cursor的状态 例如 是否注入',
        side: 'right' as Side,
        align: 'start',
      },
    },
    {
      element: '.user-info-register-time',
      popover: {
        title: '注册时间',
        description: '本地Cursor账户的注册时间',
        side: 'right' as Side,
        align: 'start',
      },
    },
    {
      element: '.user-info-machine-code',
      popover: {
        title: '机器码',
        description:
          '本地Cursor账户的机器码, 如果显示异常, 说明本地Cursor没有生成机器码, 是因为cursor没打开,这是正常情况,请不要截图询问为什么',
        side: 'right' as Side,
        align: 'start',
      },
    },
    {
      element: '.cursor-pool-usage',
      popover: {
        title: 'Cursor Pool 额度使用量',
        description:
          '当前账户的Cursor Pool额度使用情况, 不是Cursor的使用情况, 您购买的额度从这里查看',
        side: 'left' as Side,
        align: 'start',
      },
    },
    {
      element: '.advanced-model-usage',
      popover: {
        title: '高级模型使用量',
        description: '本地Cursor高级模型使用情况, 例如cluade-3.7-sonnet, 也就是对话额度',
        side: 'left' as Side,
        align: 'start',
      },
    },
    {
      element: '.basic-model-usage',
      popover: {
        title: '普通模型使用量',
        description: '本地Cursor普通模型使用情况, 例如gpt-3.5, 无限制使用, 不扣除Cursor Pool额度',
        side: 'left' as Side,
        align: 'start',
      },
    },
    {
      element: '.quick-actions-card',
      popover: {
        title: '快捷操作',
        description: '这里提供了一键切换、更换账户和更换机器码的功能。',
        side: 'top' as Side,
        align: 'center',
      },
    },
  ]

  // 创建 driver 实例
  const driverObj = ref<Driver | null>(null)

  // 启动引导
  const startTour = () => {
    // 初始化 driver
    driverObj.value = driver({
      showProgress: true,
      steps: tourSteps as DriveStep[],
      allowClose: false,
      // @ts-ignore
      overlayClickNext: false,
      stagePadding: 0,
      animate: true,
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      doneBtnText: '完成',
      // 自定义主题
      popoverClass: 'custom-driver-popover',
      // 高亮元素的样式
      stageBackground: themeColors.value.highlightBgColor,
      // 高亮元素的 z-index
      stageRadius: 5,
      onHighlighted: (_: Element | undefined, step: DriveStep) => {
        if (!step) return

        // 只在第一步显示跳过按钮
        const skipBtn = document.querySelector('.driver-popover-footer .driver-close-btn')
        if (skipBtn) {
          // @ts-ignore
          if (step.index === 0) {
            skipBtn.textContent = '跳过'
            skipBtn.classList.remove('driver-close-btn-hidden')
          } else {
            skipBtn.classList.add('driver-close-btn-hidden')
          }
        }

        // 应用当前主题的颜色
        const popover = document.querySelector('.driver-popover')
        if (popover) {
          const style = popover.getAttribute('style') || ''
          popover.setAttribute(
            'style',
            `${style}; background-color: ${themeColors.value.backgroundColor} !important; color: ${themeColors.value.textColor} !important; box-shadow: ${themeColors.value.popoverShadow} !important;`,
          )
        }

        const title = document.querySelector('.driver-popover-title')
        if (title) {
          title.setAttribute('style', `color: ${themeColors.value.titleColor} !important;`)
        }

        const description = document.querySelector('.driver-popover-description')
        if (description) {
          description.setAttribute(
            'style',
            `color: ${themeColors.value.textColor} !important; background-color: ${themeColors.value.backgroundColor} !important;`,
          )
        }

        const nextBtn = document.querySelector('.driver-next-btn')
        if (nextBtn) {
          nextBtn.setAttribute(
            'style',
            `background-color: ${themeColors.value.buttonBgColor} !important; color: ${themeColors.value.buttonTextColor} !important;`,
          )
        }

        const prevBtn = document.querySelector('.driver-prev-btn')
        if (prevBtn) {
          prevBtn.setAttribute(
            'style',
            `border-color: ${themeColors.value.borderColor} !important; color: ${themeColors.value.textColor} !important;`,
          )
        }

        const closeBtn = document.querySelector('.driver-close-btn')
        if (closeBtn) {
          closeBtn.setAttribute(
            'style',
            `border-color: ${themeColors.value.borderColor} !important; color: ${themeColors.value.textColor} !important;`,
          )
        }
      },
      onDeselected: async () => {
        try {
          // 设置引导状态为已完成
          await appStore.completeTour()
        } catch (error) {
          console.error('保存引导状态失败:', error)
        }

        if (props.onComplete) {
          props.onComplete()
        }
      },
    })

    // 开始引导
    driverObj.value.drive()
  }

  // 监听 show 属性变化
  watch(
    () => props.show,
    (newVal: boolean) => {
      if (newVal) {
        startTour()
      }
    },
  )

  // 组件卸载时清理
  onUnmounted(() => {
    if (driverObj.value) {
      driverObj.value.destroy()
    }
  })
</script>

<template>
  <div class="dashboard-tour"></div>
</template>

<style scoped>
  .dashboard-tour {
    display: none;
  }

  /* 自定义 driver.js 样式 */
  .driver-popover {
    border-radius: 8px;
    background-color: var(--n-card-color);
    color: var(--n-text-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 16px;
    max-width: 320px;
  }

  .driver-popover-title {
    font-size: 16px;
    font-weight: bold;
    color: var(--n-title-text-color);
    margin-bottom: 8px;
  }

  .driver-popover-description {
    color: var(--n-text-color);
    margin-top: 8px;
    line-height: 1.5;
    font-size: 14px;
    padding: 8px;
    border-radius: 4px;
    background-color: var(--n-card-color);
  }

  .driver-popover-footer {
    margin-top: 16px;
    display: flex;
    align-items: center;
  }

  .driver-popover-footer button {
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 14px;
    transition: all 0.2s;
    cursor: pointer;
    border: none;
    outline: none;
  }

  .driver-popover-footer .driver-next-btn {
    background-color: #18a058;
    color: white;
  }

  .driver-popover-footer .driver-next-btn:hover {
    background-color: #0e8c4a;
  }

  .driver-popover-footer .driver-prev-btn {
    background-color: transparent;
    color: var(--n-text-color);
    border: 1px solid #d9d9d9;
    margin-right: 8px;
  }

  .driver-popover-footer .driver-prev-btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .driver-popover-footer .driver-close-btn {
    background-color: transparent;
    color: var(--n-text-color);
    border: 1px solid #d9d9d9;
    margin-right: auto;
  }

  .driver-popover-footer .driver-close-btn:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .driver-popover-footer .driver-close-btn-hidden {
    display: none;
  }

  /* 浅色主题适配 */
  :root[data-theme='light'] .driver-popover {
    background-color: #ffffff;
    color: #333333;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  :root[data-theme='light'] .driver-popover-title {
    color: #000000;
  }

  :root[data-theme='light'] .driver-popover-description {
    color: #333333;
    background-color: #f5f5f5;
  }

  :root[data-theme='light'] .driver-popover-footer .driver-prev-btn,
  :root[data-theme='light'] .driver-popover-footer .driver-close-btn {
    border-color: #e0e0e0;
    color: #333333;
  }

  /* 暗色主题适配 */
  :root[data-theme='dark'] .driver-popover {
    background-color: #1f1f1f;
    color: #e0e0e0;
  }

  :root[data-theme='dark'] .driver-popover-title {
    color: #ffffff;
  }

  :root[data-theme='dark'] .driver-popover-description {
    color: #e0e0e0;
    background-color: #2a2a2a;
  }

  :root[data-theme='dark'] .driver-popover-footer .driver-prev-btn,
  :root[data-theme='dark'] .driver-popover-footer .driver-close-btn {
    border-color: #444;
    color: #e0e0e0;
  }

  /* 确保高亮区域有足够的对比度 */
  .driver-highlighted-element {
    z-index: 1000 !important;
  }

  /* 自定义高亮区域样式 */
  .driver-stage-wrapper {
    background-color: rgba(0, 0, 0, 0.5) !important;
  }

  :root[data-theme='light'] .driver-stage-wrapper {
    background-color: rgba(0, 0, 0, 0.3) !important;
  }

  /* 高亮元素的背景色 */
  .driver-stage {
    background-color: rgba(24, 160, 88, 0.1) !important;
  }

  :root[data-theme='light'] .driver-stage {
    background-color: rgba(24, 160, 88, 0.05) !important;
  }
</style>
