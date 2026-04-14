<template>
  <div class="auth-modal-overlay" :class="{ 'animating': isAnimating }" v-click-outside.mousedown="closeModal"
    v-escape-key="closeModal">
    <div class="auth-modal" @click.stop :class="{ 'scale-in': isAnimating }">
      <button class="close-btn" @click="closeModal">
        <SvgIcon name="close" />
      </button>

      <div class="auth-content">
        <div class="auth-header">
          <div class="logo-circle">
            <svg viewBox="0 0 24 24" class="github-icon" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </div>
          <h2 class="auth-title">欢迎使用 AstrBot Community</h2>
          <p class="auth-subtitle">使用 GitHub 账号登录即可开始</p>
        </div>

        <div v-if="errorMessage" class="error-message-box">
          {{ errorMessage }}
        </div>

        <button class="github-login-btn" @click="handleGithubLogin" :disabled="isLoading">
          <span v-if="isLoading" class="loading-spinner"></span>
          <svg v-else viewBox="0 0 24 24" class="btn-github-icon" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span>{{ isLoading ? '正在跳转...' : '使用 GitHub 登录' }}</span>
        </button>

        <div class="auth-footer">
          <p class="footer-text">首次登录将自动创建账号</p>
        </div>
      </div>
    </div>

    <MessageToast v-if="showToast" :message="toastMessage" :type="toastType" @close="handleToastClose" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import MessageToast from '@/components/MessageToast.vue'
import { useUserStore } from '@/stores/user.js'
import { useScrollLock } from '@/composables/useScrollLock'

const emit = defineEmits(['close', 'success'])

const userStore = useUserStore()
const { lock, unlock } = useScrollLock()

const isAnimating = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

let authWindow = null
let messageHandler = null

const handleGithubLogin = async () => {
  if (isLoading.value) return

  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await fetch('/api/auth/github')
    const result = await response.json()

    if (result.code !== 200) {
      throw new Error(result.message || '获取 GitHub 授权链接失败')
    }

    const authUrl = result.data.authUrl

    // 打开弹窗
    const width = 600
    const height = 700
    const left = window.screenLeft + (window.outerWidth - width) / 2
    const top = window.screenTop + (window.outerHeight - height) / 2

    authWindow = window.open(
      authUrl,
      'github-auth',
      `width=${width},height=${height},left=${left},top=${top},location=yes,toolbar=no,menubar=no`
    )

    if (!authWindow) {
      throw new Error('弹窗被浏览器拦截，请允许弹出窗口')
    }

    // 监听弹窗关闭
    const checkWindowClosed = setInterval(() => {
      if (authWindow && authWindow.closed) {
        clearInterval(checkWindowClosed)
        isLoading.value = false
      }
    }, 500)

  } catch (error) {
    console.error('GitHub 登录失败:', error)
    errorMessage.value = error.message || '登录失败，请稍后重试'
    isLoading.value = false
  }
}

// 监听来自弹窗的 postMessage
const handleMessage = async (event) => {
  if (event.data && event.data.type === 'github-auth') {
    const authData = event.data.data
    if (authData.success) {
      // 保存 token 和用户信息
      try {
        await userStore.handleAuthSuccess(authData.data)
        showToastMessage('登录成功！', 'success')
        setTimeout(() => {
          emit('success')
          closeModal()
          window.location.reload()
        }, 500)
      } catch (error) {
        console.error('处理登录结果失败:', error)
        errorMessage.value = '登录处理失败，请重试'
      }
    } else {
      errorMessage.value = authData.message || '登录失败'
    }
    isLoading.value = false
    if (authWindow && !authWindow.closed) {
      authWindow.close()
    }
  }
}

const showToastMessage = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

const handleToastClose = () => {
  showToast.value = false
}

const closeModal = () => {
  isAnimating.value = false
  unlock()
  if (authWindow && !authWindow.closed) {
    authWindow.close()
  }
  setTimeout(() => {
    emit('close')
  }, 200)
}

onMounted(() => {
  lock()
  isAnimating.value = true
  window.addEventListener('message', handleMessage)
})

onUnmounted(() => {
  window.removeEventListener('message', handleMessage)
  if (authWindow && !authWindow.closed) {
    authWindow.close()
  }
})
</script>

<style scoped>
.auth-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  opacity: 0;
  transition: opacity 0.2s ease;
  width: 100vw;
  height: 100%;
}

.auth-modal-overlay.animating {
  opacity: 1;
}

.auth-modal {
  background: var(--bg-color-primary);
  border-radius: 20px;
  width: 90%;
  max-width: 420px;
  position: relative;
  transform: scale(0.9);
  transition: transform 0.2s ease;
  box-shadow: 0 20px 40px var(--shadow-color);
}

.auth-modal.scale-in {
  transform: scale(1);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 30px;
  height: 30px;
  background: var(--bg-color-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  border: none;
  cursor: pointer;
  padding: 5px;
  color: var(--text-color-primary);
  transition: all 0.2s ease;
}

.close-btn:hover {
  color: var(--text-color-secondary);
  transform: scale(1.1);
}

.auth-content {
  padding: 48px 40px;
}

.auth-header {
  text-align: center;
  margin-bottom: 40px;
}

.logo-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #24292e 0%, #0d1117 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: white;
}

.github-icon {
  width: 40px;
  height: 40px;
}

.auth-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color-primary);
  margin: 0 0 8px 0;
}

.auth-subtitle {
  font-size: 15px;
  color: var(--text-color-secondary);
  margin: 0;
}

.error-message-box {
  padding: 14px 16px;
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid #ff3b30;
  border-radius: 12px;
  color: #ff3b30;
  font-size: 14px;
  text-align: center;
  margin-bottom: 24px;
}

.github-login-btn {
  width: 100%;
  padding: 16px 24px;
  background: #24292e;
  color: white;
  border: none;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
}

.github-login-btn:hover:not(:disabled) {
  background: #0d1117;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.github-login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.github-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-github-icon {
  width: 22px;
  height: 22px;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.auth-footer {
  text-align: center;
  margin-top: 32px;
}

.footer-text {
  font-size: 13px;
  color: var(--text-color-secondary);
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .auth-content {
    padding: 36px 28px;
  }

  .auth-title {
    font-size: 22px;
  }

  .github-login-btn {
    font-size: 15px;
  }
}
</style>
