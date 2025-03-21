import { ref, computed } from 'vue'
import type { NLocale, NDateLocale } from 'naive-ui'
import {
  zhCN,
  dateZhCN,
  enUS,
  dateEnUS,
  jaJP,
  dateJaJP,
  frFR,
  dateFrFR,
  deDE,
  dateDeDE,
  koKR,
  dateKoKR,
  ruRU,
  dateRuRU,
  esAR,
  dateEsAR,
} from 'naive-ui'
import { messages } from './messages'
import { getUserData, setUserData } from '@/api'

export type Language = 'zh-CN' | 'en-US' | 'ja-JP' | 'fr-FR' | 'de-DE' | 'ko-KR' | 'ru-RU' | 'es-AR'

interface LocaleConfig {
  name: string
  locale: NLocale
  dateLocale: NDateLocale
}

export const locales: Record<Language, LocaleConfig> = {
  'zh-CN': {
    name: '简体中文',
    locale: zhCN,
    dateLocale: dateZhCN,
  },
  'en-US': {
    name: 'English',
    locale: enUS,
    dateLocale: dateEnUS,
  },
  'ja-JP': {
    name: '日本語',
    locale: jaJP,
    dateLocale: dateJaJP,
  },
  'fr-FR': {
    name: 'Français',
    locale: frFR,
    dateLocale: dateFrFR,
  },
  'de-DE': {
    name: 'Deutsch',
    locale: deDE,
    dateLocale: dateDeDE,
  },
  'ko-KR': {
    name: '한국어',
    locale: koKR,
    dateLocale: dateKoKR,
  },
  'ru-RU': {
    name: 'Русский',
    locale: ruRU,
    dateLocale: dateRuRU,
  },
  'es-AR': {
    name: 'Español',
    locale: esAR,
    dateLocale: dateEsAR,
  },
}

// 默认使用中文
export const currentLang = ref<Language>('zh-CN')

// 初始化语言设置
export async function initLanguage() {
  try {
    // 从后端获取语言设置
    const lang = (await getUserData('user.info.lang')) as Language | null

    // 如果后端存在语言设置且为受支持的语言则使用该设置
    if (lang && Object.keys(locales).includes(lang)) {
      currentLang.value = lang
    } else {
      // 如果不存在或不受支持，则使用中文并保存到后端
      await setUserData('user.info.lang', 'zh-CN')
    }
  } catch (error) {
    console.error('初始化语言设置失败:', error)
  }
}

export function useI18n() {
  const setLanguage = async (lang: Language) => {
    // 更新当前语言状态
    currentLang.value = lang

    // 保存到后端数据库
    try {
      await setUserData('user.info.lang', lang)
    } catch (err) {
      console.error('同步语言设置失败:', err)
    }
  }

  // 添加t函数用于翻译
  const t = (key: string, params?: Record<string, any>) => {
    const keys = key.split('.')
    let result: any = messages[currentLang.value]

    // 遍历键路径获取翻译
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k]
      } else {
        // 如果找不到翻译，返回键名
        return key
      }
    }

    // 如果结果是字符串且有参数，替换参数
    if (typeof result === 'string' && params) {
      return result.replace(/{([^}]+)}/g, (match, name) => {
        return params[name] !== undefined ? String(params[name]) : match
      })
    }

    return result as string
  }

  return {
    currentLang,
    setLanguage,
    i18n: computed(() => messages[currentLang.value]),
    t,
  }
}
