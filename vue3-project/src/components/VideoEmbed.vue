<template>
  <div class="video-embed">
    <!-- 直链视频 -->
    <video v-if="isDirectVideo" controls class="direct-video" :src="url">
      您的浏览器不支持视频播放。
    </video>

    <!-- B站视频 -->
    <iframe v-else-if="isBilibili" class="bilibili-player" :src="bilibiliEmbedUrl"
      frameborder="0" allowfullscreen="true"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
    </iframe>

    <!-- 其他链接 -->
    <a v-else :href="url" target="_blank" rel="noopener noreferrer" class="video-link-card">
      <span class="link-icon">🎬</span>
      <span class="link-text">{{ url }}</span>
      <span class="link-hint">点击播放</span>
    </a>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  url: {
    type: String,
    required: true
  }
})

// 直链视频扩展名
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov']

// 判断是否为直链视频
const isDirectVideo = computed(() => {
  try {
    const urlObj = new URL(props.url)
    const pathname = urlObj.pathname.toLowerCase()
    return VIDEO_EXTENSIONS.some(ext => pathname.endsWith(ext))
  } catch {
    return false
  }
})

// 判断是否为B站链接
const isBilibili = computed(() => {
  return bilibiliVideoId.value !== null
})

// 解析 B站视频 ID
const bilibiliVideoId = computed(() => {
  try {
    const urlObj = new URL(props.url)
    const hostname = urlObj.hostname.toLowerCase()

    // 只处理长链接 b23.tv 短链 v1 不做
    if (!hostname.includes('bilibili.com')) {
      return null
    }

    const pathname = urlObj.pathname

    // BV 号格式: /video/BVxxxxx
    const bvMatch = pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/)
    if (bvMatch) {
      return { type: 'bv', id: bvMatch[1] }
    }

    // av 号格式: /video/avxxxxx
    const avMatch = pathname.match(/\/video\/av(\d+)/)
    if (avMatch) {
      return { type: 'av', id: avMatch[1] }
    }

    return null
  } catch {
    return null
  }
})

// B站嵌入链接
const bilibiliEmbedUrl = computed(() => {
  const videoId = bilibiliVideoId.value
  if (!videoId) return ''

  if (videoId.type === 'bv') {
    return `https://player.bilibili.com/player.html?bvid=${videoId.id}&high_quality=1&danmaku=0`
  } else {
    return `https://player.bilibili.com/player.html?aid=${videoId.id}&high_quality=1&danmaku=0`
  }
})
</script>

<style scoped>
.video-embed {
  margin: 1em 0;
  border-radius: 8px;
  overflow: hidden;
}

.direct-video {
  width: 100%;
  max-height: 500px;
  border-radius: 8px;
  background: #000;
}

.bilibili-player {
  width: 100%;
  height: 400px;
  border-radius: 8px;
}

@media (max-width: 768px) {
  .bilibili-player {
    height: 250px;
  }
}

.video-link-card {
  display: flex;
  align-items: center;
  gap: 0.75em;
  padding: 1em;
  border-radius: 8px;
  background: var(--bg-color-secondary);
  border: 1px solid var(--border-color-primary);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}

.video-link-card:hover {
  border-color: var(--primary-color);
  background: var(--bg-color-primary);
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
</style>
