<script setup lang="ts">
  import { ref, onMounted, watch, computed } from 'vue'
  import { NModal, NSpace, NButton, NScrollbar } from 'naive-ui'
  import { useArticleStore } from '../stores/article'
  import type { Article } from '../api/types'

  // 初始化store
  const articleStore = useArticleStore()
  const showModal = ref(false)
  const currentArticle = ref<Article | null>(null)
  const readyToShow = ref(false) // 添加标志，表示已准备好显示公告

  // HTML实体解码函数
  function decodeHtmlEntities(text: string): string {
    const textArea = document.createElement('textarea')
    textArea.innerHTML = text
    return textArea.value
  }

  // 解码后的文章内容
  const decodedContent = computed(() => {
    if (!currentArticle.value) return ''
    return decodeHtmlEntities(currentArticle.value.content)
  })

  // 在组件挂载时获取公告
  onMounted(async () => {
    await articleStore.init()

    // 添加更长的延迟确保已读状态已完全加载
    setTimeout(() => {
      readyToShow.value = true
      checkAndShowUnreadArticle()
    }, 1000)
  })

  // 显示公告详情
  function viewArticle(article: Article) {
    if (!readyToShow.value) return // 如果未准备好，不显示公告

    // 再次检查文章是否确实未读
    if (articleStore.isRead(article.id)) {
      return
    }
    currentArticle.value = article

    showModal.value = true
  }

  // 检查并显示未读公告
  function checkAndShowUnreadArticle() {
    if (!articleStore.articles.length || !readyToShow.value) return

    // 获取所有未读公告
    const unreadArticles = articleStore.articles.filter(
      (article) => !articleStore.isRead(article.id),
    )

    if (unreadArticles.length === 0) return

    // 按ID降序排序，优先显示ID最大的公告
    const sortedArticles = [...unreadArticles].sort((a, b) => b.id - a.id)
    const latestArticle = sortedArticles[0]

    // 显示ID最大的公告
    viewArticle(latestArticle)

    // 将其他未读公告标记为已读（但不包括当前正在显示的）
    if (sortedArticles.length > 1) {
      setTimeout(async () => {
        // 除了第一个（最新的公告）外，将其他所有公告标记为已读
        for (let i = 1; i < sortedArticles.length; i++) {
          await articleStore.markAsRead(sortedArticles[i].id)
        }
      }, 1000)
    }
  }

  // 用户点击已读按钮
  async function markAsRead() {
    if (currentArticle.value) {
      const articleId = currentArticle.value.id

      await articleStore.markAsRead(articleId)
      showModal.value = false
      currentArticle.value = null

      // 延迟一段时间后检查是否还有其他未读公告
      setTimeout(() => {
        // 重新获取所有未读公告
        const remainingUnread = articleStore.articles.filter(
          (article) => !articleStore.isRead(article.id),
        )

        // 如果还有未读公告，按ID降序排序，显示ID最大的
        if (remainingUnread.length > 0) {
          const sortedRemaining = [...remainingUnread].sort((a, b) => b.id - a.id)
          viewArticle(sortedRemaining[0])

          // 标记其他公告为已读
          if (sortedRemaining.length > 1) {
            setTimeout(async () => {
              for (let i = 1; i < sortedRemaining.length; i++) {
                await articleStore.markAsRead(sortedRemaining[i].id)
              }
            }, 500)
          }
        }
      }, 1000)
    }
  }

  // 监听文章变化，当有新公告时检查是否需要显示
  watch(
    () => articleStore.articles,
    (newArticles) => {
      if (newArticles.length && !showModal.value && readyToShow.value) {
        setTimeout(() => {
          checkAndShowUnreadArticle()
        }, 500)
      }
    },
    { deep: true },
  )

  // 监听已读状态变化
  watch(
    () => articleStore.readArticleIds,
    () => {},
    { deep: true },
  )
</script>

<template>
  <n-modal
    v-model:show="showModal"
    preset="card"
    :title="currentArticle?.title || '系统公告'"
    style="width: 600px; max-width: 90vw"
    :mask-closable="false"
  >
    <n-scrollbar style="max-height: 60vh">
      <div v-if="currentArticle" class="article-html-content" v-html="decodedContent"></div>
    </n-scrollbar>
    <template #footer>
      <n-space justify="end">
        <n-button type="primary" @click="markAsRead">已读</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<style scoped>
  .article-html-content {
    padding: 16px;
    line-height: 1.6;
  }

  :deep(h1),
  :deep(h2),
  :deep(h3) {
    margin-top: 16px;
    margin-bottom: 8px;
    color: #333;
  }

  :deep(p) {
    margin: 16px 0;
    color: #555;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 24px;
    margin: 16px 0;
  }

  :deep(li) {
    margin: 8px 0;
  }

  :deep(img) {
    max-width: 100%;
    height: auto;
  }

  :deep(div) {
    max-width: 100%;
  }
</style>
