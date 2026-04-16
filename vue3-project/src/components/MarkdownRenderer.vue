<template>
  <div class="markdown-wrapper markdown-theme-shell" :class="themeClass">
    <div class="markdown-body">
      <template v-for="segment in parsedSegments" :key="segment.key">
        <!-- 普通 Markdown 段 -->
        <div v-if="segment.type === 'markdown'" class="markdown-segment" v-html="segment.html"></div>
        <!-- 远程 Markdown 段 -->
        <RemoteMarkdown
          v-else-if="segment.type === 'remote-md'"
          :url="segment.url"
          :theme="currentTheme"
          :parent-urls="segment.parentUrls"
          @fetch-success="handleRemoteFetchSuccess"
        />
        <!-- 视频段 -->
        <VideoEmbed v-else-if="segment.type === 'video'" :url="segment.url" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import MarkdownIt from 'markdown-it'
import RemoteMarkdown from './RemoteMarkdown.vue'
import VideoEmbed from './VideoEmbed.vue'
import {
  MARKDOWN_THEME_CHANGE_EVENT,
  MARKDOWN_THEME_STORAGE_KEY,
  loadMarkdownTheme,
  normalizeMarkdownTheme
} from '@/utils/markdownTheme'
import { splitMarkdownContent } from '@/utils/markdownContent'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  // 父链传递过来的已访问 URL 集合，用于递归深度和循环检测
  parentUrls: {
    type: Set,
    default: () => new Set()
  },
  // 可选的外部主题覆盖（如果传入则使用，否则从 localStorage 读取）
  theme: {
    type: String,
    default: ''
  }
})

// 初始化 markdown-it
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

md.renderer.rules.fence = (tokens, idx, options) => {
  const token = tokens[idx]
  const info = token.info ? md.utils.unescapeAll(token.info).trim() : ''
  const langName = info ? info.split(/\s+/g)[0] : ''
  const className = langName ? ` class="${options.langPrefix}${md.utils.escapeHtml(langName)}"` : ''
  const languageLabel = md.utils.escapeHtml((langName || 'text').toUpperCase())
  const code = md.utils.escapeHtml(token.content)

  return `<pre data-language="${languageLabel}"><code${className}>${code}</code></pre>\n`
}

const resolveTheme = (theme = '') => {
  return theme ? normalizeMarkdownTheme(theme) : loadMarkdownTheme()
}

const currentTheme = ref(resolveTheme(props.theme))

const themeClass = computed(() => {
  return `markdown-theme--${currentTheme.value}`
})

const handleThemeChange = (event) => {
  if (props.theme) return
  currentTheme.value = normalizeMarkdownTheme(event.detail?.theme || loadMarkdownTheme())
}

const handleStorageChange = (event) => {
  if (props.theme) return
  if (!event.key || event.key === MARKDOWN_THEME_STORAGE_KEY) {
    currentTheme.value = loadMarkdownTheme()
  }
}

watch(() => props.theme, (newTheme) => {
  currentTheme.value = resolveTheme(newTheme)
}, { immediate: true })

// 当前渲染链的 URLs（包括父链）
const currentUrls = computed(() => {
  return props.parentUrls || new Set()
})

// 解析内容为分段
const parsedSegments = computed(() => {
  return splitMarkdownContent(props.content, currentUrls.value).map((segment, index) => {
    if (segment.type === 'markdown') {
      return {
        ...segment,
        html: md.render(segment.content),
        key: `markdown:${index}`
      }
    }

    if (segment.type === 'remote-md') {
      return {
        ...segment,
        key: `remote-md:${segment.url}:${index}`
      }
    }

    return {
      ...segment,
      key: `video:${segment.url}:${index}`
    }
  })
})

const handleRemoteFetchSuccess = () => {}

onMounted(() => {
  window.addEventListener(MARKDOWN_THEME_CHANGE_EVENT, handleThemeChange)
  window.addEventListener('storage', handleStorageChange)
})

onBeforeUnmount(() => {
  window.removeEventListener(MARKDOWN_THEME_CHANGE_EVENT, handleThemeChange)
  window.removeEventListener('storage', handleStorageChange)
})
</script>

<style scoped>
.markdown-wrapper {
  width: 100%;
  min-width: 0;
}

.markdown-body {
  min-width: 0;
}
</style>
