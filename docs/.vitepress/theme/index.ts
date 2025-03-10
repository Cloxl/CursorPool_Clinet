import DefaultTheme from 'vitepress/theme'
import mediumZoom from 'medium-zoom'
import { onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import type { Theme } from 'vitepress'
import './custom.css'

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute()
    const initZoom = () => {
      mediumZoom('.main img', { 
        background: 'var(--vp-c-bg)',
        margin: 24,
      })
    }
    onMounted(() => {
      initZoom()
    })
    watch(
      () => route.path,
      () => nextTick(() => initZoom())
    )
  }
} satisfies Theme 
 