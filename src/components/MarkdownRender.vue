<script setup lang="ts">
  import { ref, onMounted, watch } from 'vue'
  import MarkdownIt from 'markdown-it'
  import 'highlight.js/styles/github.css'
  import hljs from 'highlight.js'

  const props = defineProps<{
    content: string
  }>()

  const htmlContent = ref('')

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight: (str, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, {
            language: lang,
          }).value
        } catch (e) {
          console.error(e)
        }
      }
      return ''
    },
  })

  const renderMarkdown = () => {
    htmlContent.value = md.render(props.content)
  }

  onMounted(() => {
    renderMarkdown()
  })

  watch(() => props.content, renderMarkdown)
</script>

<template>
  <div class="markdown-body" v-html="htmlContent"></div>
</template>

<style scoped>
  .markdown-body {
    box-sizing: border-box;
    min-width: 200px;
    max-width: 100%;
    padding: 16px;
  }

  .markdown-body :deep(h1) {
    font-size: 2em;
    margin-top: 0;
    margin-bottom: 16px;
    font-weight: 600;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #eaecef;
  }

  .markdown-body :deep(h2) {
    font-size: 1.5em;
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    padding-bottom: 0.3em;
    border-bottom: 1px solid #eaecef;
  }

  .markdown-body :deep(h3) {
    font-size: 1.25em;
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
  }

  .markdown-body :deep(p),
  .markdown-body :deep(ul),
  .markdown-body :deep(ol) {
    margin-top: 0;
    margin-bottom: 16px;
  }

  .markdown-body :deep(ul),
  .markdown-body :deep(ol) {
    padding-left: 2em;
  }

  .markdown-body :deep(hr) {
    height: 0.25em;
    padding: 0;
    margin: 24px 0;
    background-color: #e1e4e8;
    border: 0;
  }

  .markdown-body :deep(a) {
    color: #0366d6;
    text-decoration: none;
  }

  .markdown-body :deep(a:hover) {
    text-decoration: underline;
  }

  .markdown-body :deep(code) {
    padding: 0.2em 0.4em;
    margin: 0;
    font-size: 85%;
    background-color: rgba(27, 31, 35, 0.05);
    border-radius: 3px;
  }

  .markdown-body :deep(pre) {
    padding: 16px;
    overflow: auto;
    font-size: 85%;
    line-height: 1.45;
    background-color: #f6f8fa;
    border-radius: 3px;
  }

  .markdown-body :deep(pre code) {
    display: inline;
    max-width: auto;
    padding: 0;
    margin: 0;
    overflow: visible;
    line-height: inherit;
    word-wrap: normal;
    background-color: transparent;
    border: 0;
  }

  .markdown-body :deep(table) {
    display: block;
    width: 100%;
    overflow: auto;
    border-spacing: 0;
    border-collapse: collapse;
  }

  .markdown-body :deep(table th),
  .markdown-body :deep(table td) {
    padding: 6px 13px;
    border: 1px solid #dfe2e5;
  }

  .markdown-body :deep(table tr:nth-child(2n)) {
    background-color: #f6f8fa;
  }
</style>
