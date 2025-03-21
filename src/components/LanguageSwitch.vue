<script setup lang="ts">
  import { NSelect } from 'naive-ui'
  import { useI18n } from '../locales'
  import { locales, type Language } from '../locales'
  import { computed } from 'vue'

  const props = defineProps({
    // 是否在紧凑布局中使用
    compact: {
      type: Boolean,
      default: false,
    },
    // 是否显示标签
    showLabel: {
      type: Boolean,
      default: true,
    },
  })

  const { currentLang, setLanguage } = useI18n()

  // 将选项格式化为Select组件需要的格式
  const selectOptions = computed(() =>
    Object.entries(locales).map(([key, value]) => ({
      label: value.name,
      value: key,
      key,
    })),
  )

  const handleSelect = (key: string) => {
    setLanguage(key as Language)
  }
</script>

<template>
  <div class="flex items-center" :class="{ 'gap-0': props.compact, 'gap-1': !props.compact }">
    <!-- 标签 -->
    <div v-if="showLabel" class="text-sm whitespace-nowrap">语言</div>

    <!-- 语言选择下拉框 -->
    <n-select
      v-model:value="currentLang"
      :options="selectOptions"
      size="small"
      :style="{
        width: props.compact ? '100px' : '120px',
      }"
      @update:value="handleSelect"
    />
  </div>
</template>

<style scoped>
  /* Remove custom styling to use default NaiveUI appearance */
</style>
