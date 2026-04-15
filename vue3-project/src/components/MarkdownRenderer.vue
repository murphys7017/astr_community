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
import { ref, computed, onMounted } from 'vue'
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

// 主题相关
const STORAGE_KEY = 'markdownTheme'
const DEFAULT_THEME = 'phycat-mint'

const currentTheme = ref(DEFAULT_THEME)

const themeClass = computed(() => {
  return `markdown-theme--${currentTheme.value}`
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

// 从 localStorage 加载主题
const loadTheme = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'phycat-mint' || saved === 'phycat-abyss') {
      currentTheme.value = saved
    }
  } catch (e) {
    console.error('Failed to load theme:', e)
  }
}

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

/* Phycat Mint 主题 */
.markdown-theme--phycat-mint .markdown-body {
  color: #333;
}

.markdown-theme--phycat-mint .markdown-body h1,
.markdown-theme--phycat-mint .markdown-body h2,
.markdown-theme--phycat-mint .markdown-body h3,
.markdown-theme--phycat-mint .markdown-body h4,
.markdown-theme--phycat-mint .markdown-body h5,
.markdown-theme--phycat-mint .markdown-body h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-theme--phycat-mint .markdown-body h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
.markdown-theme--phycat-mint .markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
.markdown-theme--phycat-mint .markdown-body h3 { font-size: 1.25em; }
.markdown-theme--phycat-mint .markdown-body h4 { font-size: 1em; }

.markdown-theme--phycat-mint .markdown-body p {
  margin-top: 0;
  margin-bottom: 1em;
}

.markdown-theme--phycat-mint .markdown-body ul,
.markdown-theme--phycat-mint .markdown-body ol {
  margin-top: 0;
  margin-bottom: 1em;
  padding-left: 2em;
}

.markdown-theme--phycat-mint .markdown-body code {
  background: #f6f8fa;
  border-radius: 3px;
  font-size: 0.85em;
  padding: 0.2em 0.4em;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.markdown-theme--phycat-mint .markdown-body pre {
  background: #f6f8fa;
  border-radius: 6px;
  padding: 16px;
  overflow: auto;
  margin-top: 0;
  margin-bottom: 1em;
}

.markdown-theme--phycat-mint .markdown-body pre code {
  background: transparent;
  padding: 0;
}

.markdown-theme--phycat-mint .markdown-body blockquote {
  margin: 0;
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin-bottom: 1em;
}

.markdown-theme--phycat-mint .markdown-body table {
  border-spacing: 0;
  border-collapse: collapse;
  margin-bottom: 1em;
  width: 100%;
}

.markdown-theme--phycat-mint .markdown-body table th,
.markdown-theme--phycat-mint .markdown-body table td {
  border: 1px solid #dfe2e5;
  padding: 6px 13px;
}

.markdown-theme--phycat-mint .markdown-body table tr {
  background: #fff;
  border-top: 1px solid #c6cbd1;
}

.markdown-theme--phycat-mint .markdown-body table tr:nth-child(2n) {
  background: #f6f8fa;
}

.markdown-theme--phycat-mint .markdown-body a {
  color: #0366d6;
  text-decoration: none;
}

.markdown-theme--phycat-mint .markdown-body a:hover {
  text-decoration: underline;
}

.markdown-theme--phycat-mint .markdown-body img {
  max-width: 100%;
  box-sizing: content-box;
}

.markdown-theme--phycat-mint .markdown-body hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background: #e1e4e8;
  border: 0;
}

/* Phycat Abyss 主题 */
.markdown-theme--phycat-abyss .markdown-body {
  color: #c9d1d9;
}

.markdown-theme--phycat-abyss .markdown-body h1,
.markdown-theme--phycat-abyss .markdown-body h2,
.markdown-theme--phycat-abyss .markdown-body h3,
.markdown-theme--phycat-abyss .markdown-body h4,
.markdown-theme--phycat-abyss .markdown-body h5,
.markdown-theme--phycat-abyss .markdown-body h6 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
  line-height: 1.25;
  color: #eee;
}

.markdown-theme--phycat-abyss .markdown-body h1 { font-size: 2em; border-bottom: 1px solid #30363d; padding-bottom: 0.3em; }
.markdown-theme--phycat-abyss .markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid #30363d; padding-bottom: 0.3em; }
.markdown-theme--phycat-abyss .markdown-body h3 { font-size: 1.25em; }
.markdown-theme--phycat-abyss .markdown-body h4 { font-size: 1em; }

.markdown-theme--phycat-abyss .markdown-body p {
  margin-top: 0;
  margin-bottom: 1em;
}

.markdown-theme--phycat-abyss .markdown-body ul,
.markdown-theme--phycat-abyss .markdown-body ol {
  margin-top: 0;
  margin-bottom: 1em;
  padding-left: 2em;
}

.markdown-theme--phycat-abyss .markdown-body code {
  background: #341a0a;
  border-radius: 3px;
  font-size: 0.85em;
  padding: 0.2em 0.4em;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  color: #f97583;
}

.markdown-theme--phycat-abyss .markdown-body pre {
  background: #161b22;
  border-radius: 6px;
  padding: 16px;
  overflow: auto;
  margin-top: 0;
  margin-bottom: 1em;
}

.markdown-theme--phycat-abyss .markdown-body pre code {
  background: transparent;
  padding: 0;
  color: #c9d1d9;
}

.markdown-theme--phycat-abyss .markdown-body blockquote {
  margin: 0;
  padding: 0 1em;
  color: #8b949e;
  border-left: 0.25em solid #30363d;
  margin-bottom: 1em;
}

.markdown-theme--phycat-abyss .markdown-body table {
  border-spacing: 0;
  border-collapse: collapse;
  margin-bottom: 1em;
  width: 100%;
}

.markdown-theme--phycat-abyss .markdown-body table th,
.markdown-theme--phycat-abyss .markdown-body table td {
  border: 1px solid #30363d;
  padding: 6px 13px;
}

.markdown-theme--phycat-abyss .markdown-body table tr {
  background: #0d1117;
  border-top: 1px solid #21262d;
}

.markdown-theme--phycat-abyss .markdown-body table tr:nth-child(2n) {
  background: #161b22;
}

.markdown-theme--phycat-abyss .markdown-body a {
  color: #58a6ff;
  text-decoration: none;
}

.markdown-theme--phycat-abyss .markdown-body a:hover {
  text-decoration: underline;
}

.markdown-theme--phycat-abyss .markdown-body img {
  max-width: 100%;
  box-sizing: content-box;
}

.markdown-theme--phycat-abyss .markdown-body hr {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background: #21262d;
  border: 0;
}
</style>
