<template>
  <button :class="[
    'like-button',
    {
      'active': isLiked,
      'small': size === 'small',
      'medium': size === 'medium',
      'large': size === 'large'
    }
  ]" @click="handleClick">
    <span class="like-btn-wrapper">

      <span v-if="showRing" class="like-ring" @animationend="onRingEnd"></span>
      <span v-if="showParticles" :key="particleBurstKey" class="like-particles" aria-hidden="true">
        <span
          v-for="particle in particleStyles"
          :key="particle.id"
          class="like-particle"
          :style="particle.style"
        ></span>
      </span>

      <SvgIcon :name="isLiked ? 'liked' : 'like'" :class="{
        liked: isLiked,
        scaling: scaling
      }" :width="iconSize" :height="iconSize" @animationend="onScaleEnd" />
    </span>
  </button>
</template>

<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import SvgIcon from './SvgIcon.vue'

// Props
const props = defineProps({
  // 是否已点赞
  isLiked: {
    type: Boolean,
    default: false
  },
  // 按钮尺寸
  size: {
    type: String,
    default: 'medium',
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  }
})

// Emits
const emit = defineEmits(['click'])

// 动画状态
const scaling = ref(false)
const showRing = ref(false)
const showParticles = ref(false)
const particleBurstKey = ref(0)
let particleTimer = null

const particleConfigs = [
  { id: 'p1', x: -2, y: -28, size: 6, color: '#ff5d73', delay: 0, duration: 620, rotation: -18 },
  { id: 'p2', x: 18, y: -24, size: 5, color: '#ff8a5b', delay: 30, duration: 640, rotation: 12 },
  { id: 'p3', x: 28, y: -4, size: 4, color: '#ffd166', delay: 10, duration: 600, rotation: 24 },
  { id: 'p4', x: 22, y: 18, size: 5, color: '#7dd3fc', delay: 40, duration: 660, rotation: 18 },
  { id: 'p5', x: 0, y: 30, size: 4, color: '#f9a8d4', delay: 20, duration: 620, rotation: -12 },
  { id: 'p6', x: -22, y: 20, size: 5, color: '#c4b5fd', delay: 60, duration: 680, rotation: -22 },
  { id: 'p7', x: -28, y: -2, size: 4, color: '#fb7185', delay: 15, duration: 610, rotation: -30 },
  { id: 'p8', x: -18, y: -24, size: 5, color: '#fdba74', delay: 45, duration: 650, rotation: 8 }
]

// 计算图标尺寸
const iconSize = computed(() => {
  const sizeMap = {
    small: '16px',
    medium: '20px',
    large: '24px'
  }
  return sizeMap[props.size]
})

const particleStyles = computed(() => particleConfigs.map((particle) => ({
  id: particle.id,
  style: {
    '--particle-x': `${particle.x}px`,
    '--particle-y': `${particle.y}px`,
    '--particle-size': `${particle.size}px`,
    '--particle-color': particle.color,
    '--particle-delay': `${particle.delay}ms`,
    '--particle-duration': `${particle.duration}ms`,
    '--particle-rotate': `${particle.rotation}deg`
  }
})))

const clearParticleTimer = () => {
  if (particleTimer) {
    clearTimeout(particleTimer)
    particleTimer = null
  }
}

// 触发动画
const triggerAnimation = (willBeLiked) => {
  // 重置动画状态
  scaling.value = false
  showRing.value = false
  showParticles.value = false
  clearParticleTimer()
  particleBurstKey.value += 1

  // 触发动画
  setTimeout(() => {
    scaling.value = true
    // 只有在点赞时才显示圆环动画
    if (willBeLiked) {
      showRing.value = true
      showParticles.value = true
      particleTimer = setTimeout(() => {
        showParticles.value = false
        particleTimer = null
      }, 760)
    }
  }, 0)
}

// 处理点击事件
const handleClick = (event) => {
  const willBeLiked = !props.isLiked
  triggerAnimation(willBeLiked)
  emit('click', willBeLiked, event)
}

// 处理动画结束事件
const onScaleEnd = () => {
  scaling.value = false
}

const onRingEnd = () => {
  showRing.value = false
}

onBeforeUnmount(() => {
  clearParticleTimer()
})
</script>

<style scoped>
.like-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-color-secondary);
  transition: color 0.2s ease;
  padding: 4px;
  border-radius: 4px;
  padding: 2px;
  overflow: visible;
}

.like-button:hover {
  color: var(--text-color-primary);
}

.like-btn-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

/* 点赞动画样式 */
.scaling {
  animation: likeScale 0.5s linear both;
}

.like-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #ff4757;
  background: transparent;
  transform: translate(-50%, -50%) scale(0);
  animation: likeRing 0.6s ease-out;
  pointer-events: none;
}

.like-particles {
  position: absolute;
  inset: 50% auto auto 50%;
  width: 0;
  height: 0;
  pointer-events: none;
}

.like-particle {
  position: absolute;
  left: 0;
  top: 0;
  width: var(--particle-size);
  height: var(--particle-size);
  margin-left: calc(var(--particle-size) * -0.5);
  margin-top: calc(var(--particle-size) * -0.5);
  border-radius: 999px;
  background: var(--particle-color);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18);
  opacity: 0;
  transform: translate3d(0, 0, 0) scale(0.4) rotate(0deg);
  animation: likeParticle var(--particle-duration) cubic-bezier(0.18, 0.84, 0.32, 1) var(--particle-delay) forwards;
}

.like-particle:nth-child(3n) {
  border-radius: 2px;
}

.like-particle:nth-child(4n) {
  width: calc(var(--particle-size) + 1px);
  height: calc(var(--particle-size) - 1px);
}

/* 小尺寸的圆环 */
.like-button.small .like-ring {
  width: 16px;
  height: 16px;
}

/* 中尺寸的圆环 */
.like-button.medium .like-ring {
  width: 20px;
  height: 20px;
}

/* 大尺寸的圆环 */
.like-button.large .like-ring {
  width: 24px;
  height: 24px;
}

@keyframes likeScale {
  0% {
    transform: scale(1);
  }

  30% {
    transform: scale(0.5);
  }

  50% {
    transform: scale(1.2);
  }

  80% {
    transform: scale(0.9);
  }

  100% {
    transform: scale(1);
  }
}

@keyframes likeRing {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }

  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

@keyframes likeParticle {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0) scale(0.35) rotate(0deg);
  }

  18% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate3d(var(--particle-x), var(--particle-y), 0) scale(1) rotate(var(--particle-rotate));
  }
}

@media (prefers-reduced-motion: reduce) {
  .scaling,
  .like-ring,
  .like-particle {
    animation: none !important;
  }
}
</style>
