<template>
  <div class="remote-markdown">
    <div v-if="state === 'loading'" class="remote-loading">
      <span class="loading-spinner"></span>
      <span>加载中...</span>
    </div>

    <div v-else-if="state === 'error'" class="remote-error">
      <a :href="url" target="_blank" rel="noopener noreferrer" class="remote-link-card">
        <span class="link-icon">📄</span>
        <span class="link-text">{{ url }}</span>
        <span class="link-hint">点击查看原文</span>
      </a>
    </div>

    <div v-else-if="state === 'success' && fetchedContent" class="remote-content">
      <div class="remote-source-badge">
        <span>来自: </span>
        <a :href="url" target="_blank" rel="noopener noreferrer">{{ displayUrl }}</a>
      </div>
      <MarkdownRenderer :content="fetchedContent" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MarkdownRenderer from './MarkdownRenderer.vue'

const props = defineProps({
  url: {
    type: String,
    required: true
  },
  theme: {
    type: String,
    default: 'phycat-mint'
  }
})

const emit = defineEmits(['fetch-success'])

const state = ref('loading') // loading, success, error
const fetchedContent = ref('')
const fetchedUrls = ref(new Set())

const MAX_CONTENT_SIZE = 100 * 1024 // 100KB
const FETCH_TIMEOUT = 8000 // 8秒
const MAX_RECURSION = 2

const displayUrl = computed(() => {
  try {
    const urlObj = new URL(props.url)
    return urlObj.hostname + urlObj.pathname
  } catch {
    return props.url
  }
})

const fetchRemoteMarkdown = async () => {
  // 检查递归深度
  if (fetchedUrls.value.has(props.url)) {
    state.value = 'error'
    return
  }

  if (fetchedUrls.value.size >= MAX_RECURSION) {
    state.value = 'error'
    return
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    const response = await fetch(props.url, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/markdown, text/plain, */*'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    // 检查内容大小
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_CONTENT_SIZE) {
      throw new Error('Content too large')
    }

    const text = await response.text()

    if (text.length > MAX_CONTENT_SIZE) {
      throw new Error('Content too large')
    }

    fetchedUrls.value.add(props.url)
    fetchedContent.value = text
    state.value = 'success'
    emit('fetch-success', text)
  } catch (error) {
    console.error('Failed to fetch remote markdown:', error)
    state.value = 'error'
  }
}

onMounted(() => {
  fetchRemoteMarkdown()
})
</script>

<style scoped>
.remote-markdown {
  margin: 1em 0;
  padding: 1em;
  border-radius: 8px;
  background: var(--bg-color-secondary);
  border: 1px solid var(--border-color-primary);
}

.remote-loading {
  display: flex;
  align-items: center;
  gap: 0.5em;
  color: var(--text-color-secondary);
}

.loading-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color-primary);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.remote-error {
  display: block;
}

.remote-link-card {
  display: flex;
  align-items: center;
  gap: 0.75em;
  padding: 1em;
  border-radius: 8px;
  background: var(--bg-color-primary);
  border: 1px solid var(--border-color-primary);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.remote-link-card:hover {
  border-color: var(--primary-color);
  background: var(--bg-color-secondary);
}

.link-icon {
  font-size: 1.5em;
}

.link-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9em;
  color: var(--text-color-primary);
}

.link-hint {
  font-size: 0.8em;
  color: var(--text-color-secondary);
}

.remote-content {
  position: relative;
}

.remote-source-badge {
  font-size: 0.8em;
  color: var(--text-color-secondary);
  margin-bottom: 0.75em;
  padding-bottom: 0.5em;
  border-bottom: 1px solid var(--border-color-primary);
}

.remote-source-badge a {
  color: var(--primary-color);
  text-decoration: none;
}

.remote-source-badge a:hover {
  text-decoration: underline;
}
</style>
