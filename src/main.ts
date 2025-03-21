import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/main.css'
// 通用字体
import 'vfonts/Lato.css'
// 等宽字体
import 'vfonts/FiraCode.css'
import Logger from './utils/logger'
// Import UnoCSS
import 'uno.css'

const app = createApp(App)
const pinia = createPinia()

app.use(router as any)
app.use(pinia)

// 设置全局错误处理
Logger.setupErrorHandler()

app.mount('#app')
