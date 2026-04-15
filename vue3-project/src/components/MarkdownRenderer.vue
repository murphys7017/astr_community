<template>
  <div class="markdown-wrapper" :class="themeClass">
    <div class="markdown-body">
      <template v-for="(segment, index) in parsedSegments" :key="index">
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
import { ref, computed, watch, onMounted } from 'vue'
import MarkdownIt from 'markdown-it'
import RemoteMarkdown from './RemoteMarkdown.vue'
import VideoEmbed from './VideoEmbed.vue'

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

// Markdown 主题相关
const MARKDOWN_THEME_STORAGE_KEY = 'markdownTheme'
const DEFAULT_MARKDOWN_THEME = 'phycat-mint'
const SUPPORTED_THEMES = ['phycat-mint', 'phycat-abyss']

const currentTheme = ref(DEFAULT_MARKDOWN_THEME)
let currentStyleLink = null

const themeClass = computed(() => {
  return `markdown-theme--${currentTheme.value}`
})

// 加载 Markdown 主题 CSS
const loadMarkdownThemeCSS = (theme) => {
  if (!SUPPORTED_THEMES.includes(theme)) {
    theme = DEFAULT_MARKDOWN_THEME
  }

  // 移除之前的样式链接
  if (currentStyleLink) {
    currentStyleLink.remove()
    currentStyleLink = null
  }

  // 创建新的样式链接
  currentStyleLink = document.createElement('link')
  currentStyleLink.rel = 'stylesheet'
  currentStyleLink.href = `/css/markdown-themes/${theme}.css`
  document.head.appendChild(currentStyleLink)
}

// 从 localStorage 加载 Markdown 主题
const loadTheme = () => {
  // 优先使用 props.theme（如果是有效的）
  if (props.theme && SUPPORTED_THEMES.includes(props.theme)) {
    currentTheme.value = props.theme
  } else {
    // 否则从 localStorage 读取
    try {
      const saved = localStorage.getItem(MARKDOWN_THEME_STORAGE_KEY)
      if (saved && SUPPORTED_THEMES.includes(saved)) {
        currentTheme.value = saved
      }
    } catch (e) {
      console.error('Failed to load markdown theme:', e)
    }
  }
  loadMarkdownThemeCSS(currentTheme.value)
}

// 监听 props.theme 变化
watch(() => props.theme, (newTheme) => {
  if (newTheme && SUPPORTED_THEMES.includes(newTheme)) {
    currentTheme.value = newTheme
    loadMarkdownThemeCSS(newTheme)
  }
})

// 当前渲染链的 URLs（包括父链）
const currentUrls = computed(() => {
  return props.parentUrls || new Set()
})

// 自定义块语法正则
const BLOCK_REGEX = /^\[::(\w+)\]\((https?:\/\/[^\)]+)\)$/gm

// 解析内容为分段
const parsedSegments = computed(() => {
  if (!props.content) return []

  const lines = props.content.split('\n')
  const segments = []
  let currentMarkdown = []

  const flushMarkdown = () => {
    if (currentMarkdown.length > 0) {
      const text = currentMarkdown.join('\n').trim()
      if (text) {
        segments.push({
          type: 'markdown',
          html: md.render(text)
        })
      }
      currentMarkdown = []
    }
  }

  for (const line of lines) {
    // 重置正则的 lastIndex
    BLOCK_REGEX.lastIndex = 0
    const match = BLOCK_REGEX.exec(line)

    if (match) {
      flushMarkdown()
      const [, type, url] = match
      if (type === 'md') {
        segments.push({ type: 'remote-md', url, parentUrls: currentUrls.value })
      } else if (type === 'video') {
        segments.push({ type: 'video', url })
      } else {
        // 未知类型，当作普通 Markdown
        currentMarkdown.push(line)
      }
    } else {
      currentMarkdown.push(line)
    }
  }

  flushMarkdown()
  return segments
})

// 处理远程 Markdown 抓取成功（用于后续扩展）
const handleRemoteFetchSuccess = (content) => {
  // 目前不需要额外处理，RemoteMarkdown 组件自己会渲染
}

onMounted(() => {
  loadTheme()
})
</script>

<style scoped>
.markdown-wrapper {
  width: 100%;
}

.markdown-body {
  line-height: 1.6;
  word-wrap: break-word;
}

.markdown-segment {
  margin-bottom: 1em;
}
</style>
