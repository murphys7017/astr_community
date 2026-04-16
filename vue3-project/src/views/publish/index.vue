<template>
  <div class="publish-container">
    <div class="publish-header">
      <div class="header-left">
        <h1 class="page-title">发布笔记</h1>
      </div>
      <div class="header-right">
        <button class="draft-box-btn" @click="goToDraftBox">
          <SvgIcon name="draft" width="20" height="20" color="white" />
          <span>草稿箱</span>
        </button>
        <button class="manage-btn" @click="goToPostManagement">
          <SvgIcon name="post" width="20" height="20" />
          <span>笔记管理</span>
        </button>
      </div>
    </div>

    <div class="publish-content">
      <!-- 登录提示 -->
      <div class="login-prompt" v-if="!isLoggedIn">
        <div class="prompt-content">
          <SvgIcon name="post" width="48" height="48" class="prompt-icon" />
          <h3>请先登录</h3>
          <p>登录后即可发布和管理笔记</p>
        </div>
      </div>

      <form v-if="isLoggedIn" @submit.prevent="handlePublish" class="publish-form">
        <div class="publish-mode-hint">
          <SvgIcon name="post" width="18" height="18" />
          <span>当前为纯文本发布模式，支持 Markdown 语法。图片和视频请用外链。</span>
        </div>

        <div class="input-section">
          <input v-model="form.title" type="text" class="title-input" placeholder="请输入标题" maxlength="100" />
          <div class="char-count">{{ form.title.length }}/100</div>
        </div>

        <div class="input-section">
          <label class="input-label" for="cover-url-input">封面链接</label>
          <input
            id="cover-url-input"
            v-model="form.cover_url"
            type="url"
            class="cover-url-input"
            placeholder="可选：请输入封面外链，用于卡片封面展示"
            maxlength="2048"
          />
          <div class="input-hint">仅记录外链地址，不走站内图片上传。建议使用稳定的 http/https 图片链接。</div>
        </div>

        <div class="input-section">
          <div class="content-input-wrapper">
            <textarea v-model="form.content" class="content-textarea" placeholder="请输入内容（支持 Markdown）" maxlength="5242880"></textarea>
            <div class="char-count">{{ form.content.length }}/5242880</div>
          </div>
          <div class="content-toolbar">
            <button type="button" class="import-markdown-btn" @click="triggerMarkdownImport">
              <SvgIcon name="post" width="16" height="16" />
              <span>导入 Markdown 文件</span>
            </button>
            <span v-if="importedMarkdownFileName" class="imported-file-name">
              已导入：{{ importedMarkdownFileName }}
            </span>
          </div>
          <input
            ref="markdownFileInput"
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            class="hidden-file-input"
            @change="handleMarkdownFileSelect"
          />
        </div>

        <div class="markdown-help">
          <details>
            <summary>Markdown 语法帮助</summary>
            <div class="help-content">
              <p><code># 标题</code> - 一级标题</p>
              <p><code>## 标题</code> - 二级标题</p>
              <p><code>**粗体**</code> - 粗体文字</p>
              <p><code>*斜体*</code> - 斜体文字</p>
              <p><code>[链接](url)</code> - 普通链接</p>
              <p><code>![图片](url)</code> - 外链图片</p>
              <p><code>[::md](url)</code> - 远程 Markdown</p>
              <p><code>[::video](url)</code> - 视频或 B站 链接</p>
              <p><code>\`代码\`</code> - 行内代码</p>
              <p><code>```代码块```</code> - 代码块</p>
            </div>
          </details>
        </div>

        <div class="category-section">
          <div class="section-title">分类</div>
          <DropdownSelect v-model="form.category_id" :options="categories" placeholder="请选择分类" label-key="name"
            value-key="id" max-width="300px" min-width="200px" @change="handleCategoryChange" />
        </div>

        <div class="tag-section">
          <div class="section-title">标签 (最多10个)</div>
          <TagSelector v-model="form.tags" :max-tags="10" />
        </div>
      </form>

      <div v-if="isLoggedIn" class="publish-actions">
        <button class="draft-btn" :disabled="!canSaveDraft || isSavingDraft" @click="handleSaveDraft">
          {{ isSavingDraft ? '保存中...' : '存草稿' }}
        </button>
        <button class="publish-btn" :disabled="!canPublish || isPublishing" @click="handlePublish">
          {{ isPublishing ? '发布中...' : '发布' }}
        </button>
      </div>
    </div>

    <MessageToast v-if="showToast" :message="toastMessage" :type="toastType" @close="handleToastClose" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { useNavigationStore } from '@/stores/navigation'
import { createPost, getPostDetail, updatePost } from '@/api/posts'
import { getCategories } from '@/api/categories'

import SvgIcon from '@/components/SvgIcon.vue'
import TagSelector from '@/components/TagSelector.vue'
import DropdownSelect from '@/components/DropdownSelect.vue'
import MessageToast from '@/components/MessageToast.vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const authStore = useAuthStore()
const navigationStore = useNavigationStore()

const isPublishing = ref(false)
const isSavingDraft = ref(false)

const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')
const markdownFileInput = ref(null)
const importedMarkdownFileName = ref('')

const MAX_CONTENT_LENGTH = 5242880
const MAX_MARKDOWN_FILE_SIZE = 2 * 1024 * 1024

const form = reactive({
  title: '',
  content: '',
  cover_url: '',
  tags: [],
  category_id: null
})

// 草稿相关状态
const currentDraftId = ref(null)
const isEditMode = ref(false)

const categories = ref([])

const canPublish = computed(() => {
  return Boolean(form.title.trim() && form.content.trim() && form.category_id)
})

const canSaveDraft = computed(() => {
  return Boolean(form.title.trim() || form.content.trim())
})

// 登录状态检查
const isLoggedIn = computed(() => userStore.isLoggedIn)

onMounted(async () => {
  navigationStore.scrollToTop('instant')
  await loadCategories()
  const draftId = route.query.draftId
  const mode = route.query.mode

  if (draftId && mode === 'edit') {
    await loadDraftData(draftId)
  }
})

const loadCategories = async () => {
  try {
    const response = await getCategories()
    if (response.success && response.data) {
      categories.value = response.data.map(category => ({
        id: category.id,
        name: category.name
      }))
    }
  } catch (error) {
    console.error('加载分类失败:', error)
    showMessage('加载分类失败', 'error')
  }
}

const showMessage = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

const handleToastClose = () => {
  showToast.value = false
}

const goToPostManagement = () => {
  router.push('/post-management')
}

const goToDraftBox = () => {
  router.push('/draft-box')
}

const handleCategoryChange = (data) => {
  form.category_id = data.value
}

const resetMarkdownFileInput = () => {
  if (markdownFileInput.value) {
    markdownFileInput.value.value = ''
  }
}

const isValidHttpUrl = (value) => {
  try {
    const parsedUrl = new URL(value)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

const normalizeCoverUrl = () => {
  const value = form.cover_url.trim()
  if (!value) {
    return ''
  }

  if (!isValidHttpUrl(value)) {
    return null
  }

  return value
}

const triggerMarkdownImport = () => {
  markdownFileInput.value?.click()
}

const handleMarkdownFileSelect = async (event) => {
  const file = event.target?.files?.[0]
  if (!file) {
    return
  }

  const isMarkdownFile = /\.(md|markdown)$/i.test(file.name) || ['text/markdown', 'text/plain', ''].includes(file.type)
  if (!isMarkdownFile) {
    showMessage('请选择 Markdown 文件（.md / .markdown）', 'error')
    resetMarkdownFileInput()
    return
  }

  if (file.size > MAX_MARKDOWN_FILE_SIZE) {
    showMessage('Markdown 文件不能超过 2MB', 'error')
    resetMarkdownFileInput()
    return
  }

  try {
    const markdownText = await file.text()
    if (!markdownText.trim()) {
      showMessage('Markdown 文件内容为空', 'error')
      resetMarkdownFileInput()
      return
    }

    const currentContent = form.content.trim() ? form.content.replace(/\s+$/, '') : ''
    const nextContent = currentContent ? `${currentContent}\n\n${markdownText}` : markdownText

    if (nextContent.length > MAX_CONTENT_LENGTH) {
      showMessage('导入后内容超出长度限制', 'error')
      resetMarkdownFileInput()
      return
    }

    form.content = nextContent
    importedMarkdownFileName.value = file.name

    if (!form.title.trim()) {
      form.title = file.name.replace(/\.(md|markdown)$/i, '')
    }

    showMessage(currentContent ? 'Markdown 文件已追加到内容中' : 'Markdown 文件已导入', 'success')
  } catch (error) {
    console.error('Markdown 文件导入失败:', error)
    showMessage('Markdown 文件导入失败', 'error')
  } finally {
    resetMarkdownFileInput()
  }
}

// 重置表单
const resetForm = () => {
  form.title = ''
  form.content = ''
  form.cover_url = ''
  form.tags = []
  form.category_id = null
  importedMarkdownFileName.value = ''
  resetMarkdownFileInput()
}

// 加载草稿数据
const loadDraftData = async (draftId) => {
  try {
    const response = await getPostDetail(draftId)
    if (response && response.originalData) {
      const fullData = response
      const draft = response.originalData
      form.title = response.title || ''
      form.content = draft.content || ''
      form.cover_url = fullData.cover_url || draft.cover_url || draft.images?.[0] || ''
      importedMarkdownFileName.value = ''

      if (draft.tags && Array.isArray(draft.tags)) {
        form.tags = draft.tags.map(tag => {
          if (typeof tag === 'object' && tag.name) {
            return tag.name
          }
          return String(tag)
        })
      } else {
        form.tags = []
      }

      if (response.category && categories.value.length > 0) {
        const categoryItem = categories.value.find(cat => cat.name === response.category)
        form.category_id = categoryItem ? categoryItem.id : null
      } else {
        form.category_id = null
      }

      currentDraftId.value = draftId
      isEditMode.value = true

      const hasCoverOnlyImage = Array.isArray(draft.images) &&
        draft.images.length === 1 &&
        Boolean(form.cover_url) &&
        draft.images[0] === form.cover_url &&
        fullData.type !== 2

      if ((Array.isArray(draft.images) && draft.images.length > 0 && !hasCoverOnlyImage) || fullData.video_url || fullData.type === 2) {
        showMessage('检测到历史媒体内容，当前编辑不会再新增或修改媒体文件', 'info')
      }

      showMessage('草稿加载成功', 'success')
    } else {
      showMessage('草稿不存在或已被删除', 'error')
      router.push('/draft-box')
    }
  } catch (error) {
    console.error('加载草稿失败:', error)
    showMessage('加载草稿失败', 'error')
    router.push('/draft-box')
  }
}

const handlePublish = async () => {
  if (!form.title.trim()) {
    showMessage('请输入标题', 'error')
    return
  }

  if (!form.content.trim()) {
    showMessage('请输入内容', 'error')
    return
  }

  if (!form.category_id) {
    showMessage('请选择分类', 'error')
    return
  }

  const normalizedCoverUrl = normalizeCoverUrl()
  if (normalizedCoverUrl === null) {
    showMessage('封面链接格式不正确，请使用 http/https 链接', 'error')
    return
  }

  isPublishing.value = true

  try {
    const postData = {
      title: form.title.trim(),
      content: form.content,
      cover_url: normalizedCoverUrl || null,
      images: [],
      video: null,
      tags: form.tags,
      category_id: form.category_id,
      type: 1,
      status: 0  // TODO: 后续接入 AI 审核后改为 2，待审核通过后自动更新状态
    }
    showMessage('正在发布笔记...', 'info')
    let response
    if (isEditMode.value && currentDraftId.value) {
      response = await updatePost(currentDraftId.value, postData)
    } else {
      response = await createPost(postData)
    }
    if (response.success) {
      showMessage('发布成功！', 'success')
      resetForm()

      setTimeout(() => {
        router.push('/post-management')
      }, 1500)
    } else {
      showMessage(response.message || '发布失败', 'error')
    }
  } catch (err) {
    console.error('发布失败:', err)
    showMessage('发布失败，请重试', 'error')
  } finally {
    isPublishing.value = false
  }
}

const handleSaveDraft = async () => {
  if (!form.title.trim() && !form.content.trim()) {
    showMessage('请输入标题或内容', 'error')
    return
  }

  const normalizedCoverUrl = normalizeCoverUrl()
  if (normalizedCoverUrl === null) {
    showMessage('封面链接格式不正确，请使用 http/https 链接', 'error')
    return
  }

  isSavingDraft.value = true

  try {
    const draftData = {
      title: form.title.trim() || '',
      content: form.content || '',
      cover_url: normalizedCoverUrl || null,
      images: [],
      video: null,
      tags: form.tags || [],
      category_id: form.category_id || null,
      type: 1,
      status: 1
    }

    showMessage('正在保存草稿...', 'info')

    let response
    if (isEditMode.value && currentDraftId.value) {
      response = await updatePost(currentDraftId.value, draftData)
    } else {
      response = await createPost(draftData)
      if (response.success && response.data) {
        currentDraftId.value = response.data.id
        isEditMode.value = true
      }
    }

    if (response.success) {
      showMessage('草稿保存成功！', 'success')
      resetForm()

      setTimeout(() => {
        router.push('/draft-box')
      }, 1500)
    } else {
      showMessage(response.message || '草稿保存失败', 'error')
    }
  } catch (err) {
    console.error('草稿保存失败:', err)
    showMessage('草稿保存失败，请重试', 'error')
  } finally {
    isSavingDraft.value = false
  }
}
</script>

<style scoped>
.publish-container {
  min-height: 100vh;
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  padding-bottom: calc(48px + constant(safe-area-inset-bottom));
  padding-bottom: calc(48px + env(safe-area-inset-bottom));
  margin: 72px auto;
  min-width: 700px;
  max-width: 700px;
  transition: background-color 0.2s ease;
}

.publish-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: var(--bg-color-primary);
  border-bottom: 1px solid var(--border-color-primary);
  position: sticky;
  top: 0;
  z-index: 100;
  transition: background-color 0.2s ease,border-color 0.2s ease;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.draft-box-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.draft-box-btn:hover {
  background: var(--primary-color-dark);
}

.manage-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.manage-btn:hover {
  background: var(--primary-color-dark);
}

.page-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-color-primary);
}

.publish-content {
  padding: 1rem;
  max-width: 600px;
  margin: 0 auto;
  background-color: var(--bg-color-primary);
  transition: background-color 0.2s ease;
}

.publish-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.publish-mode-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--border-color-primary);
  border-radius: 12px;
  background: var(--bg-color-secondary);
  color: var(--text-color-secondary);
  font-size: 14px;
}

.input-section {
  position: relative;
}

.input-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.title-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 8px;
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  font-size: 16px;
  font-weight: bold;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.title-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.title-input::placeholder {
  color: var(--text-color-secondary);
}

.cover-url-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 8px;
  background: var(--bg-color-primary);
  color: var(--text-color-primary);
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.cover-url-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.cover-url-input::placeholder {
  color: var(--text-color-secondary);
}

.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-color-secondary);
}

.content-input-wrapper {
  position: relative;
  border: 1px solid var(--border-color-primary);
  border-radius: 8px;
  background: var(--bg-color-primary);
  transition: all 0.2s ease;
}

.content-input-wrapper:focus-within {
  border-color: var(--primary-color);
}

.content-textarea {
  width: 100%;
  padding: 12px;
  padding-bottom: 2.5rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-color-primary);
  font-size: 16px;
  line-height: 1.6;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  min-height: 200px;
  box-sizing: border-box;
  caret-color: var(--primary-color);
  resize: vertical;
}

.content-textarea:focus {
  outline: none;
}

.content-textarea::placeholder {
  color: var(--text-color-secondary);
  font-family: inherit;
}

.content-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.import-markdown-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 8px;
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.import-markdown-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.imported-file-name {
  font-size: 13px;
  color: var(--text-color-secondary);
}

.hidden-file-input {
  display: none;
}

/* Markdown 帮助 */
.markdown-help {
  margin-top: 0.5rem;
}

.markdown-help details {
  border-radius: 8px;
  background: var(--bg-color-secondary);
  border: 1px solid var(--border-color-primary);
}

.markdown-help summary {
  padding: 10px 14px;
  cursor: pointer;
  color: var(--text-color-secondary);
  font-size: 14px;
  user-select: none;
}

.markdown-help .help-content {
  padding: 10px 14px;
  border-top: 1px solid var(--border-color-primary);
}

.markdown-help .help-content p {
  margin: 6px 0;
  font-size: 13px;
  color: var(--text-color-secondary);
}

.markdown-help .help-content code {
  background: var(--bg-color-primary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
}

.char-count {
  position: absolute;
  bottom: 0.5rem;
  right: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-color-secondary);
  background: var(--bg-color-primary);
  padding: 0.25rem;
  border-radius: 4px;
}

.section-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-color-primary);
  margin-bottom: 0.75rem;
}

.category-section {
  margin-bottom: 1rem;
}

.tag-section {
  margin-bottom: 1rem;
}

.publish-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 2rem 1rem;
  margin-top: 2rem;
  background: var(--bg-color-primary);
}

.draft-btn {
  width: 20%;
  padding: 12px;
  background-color: var(--text-color-secondary);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.draft-btn:hover:not(:disabled) {
  background: var(--text-color-primary);
}

.draft-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.publish-btn {
  width: 20%;
  padding: 12px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.publish-btn:hover:not(:disabled) {
  background: var(--primary-color-dark);
}

.publish-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 960px) {
  .publish-container {
    min-width: 100%;
    max-width: 100%;
    margin: 72px 0;
  }

  .publish-header {
    padding: 0.75rem 1rem;
  }

  .header-right {
    gap: 0.5rem;
  }

  .draft-box-btn,
  .manage-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }

  .publish-content {
    padding: 0.75rem;
  }

  .publish-actions {
    padding: 1rem 0.75rem;
  }
}

/* 登录提示样式 */
.login-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.prompt-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.prompt-icon {
  color: var(--text-color-quaternary);
  margin-bottom: 16px;
}

.prompt-content h3 {
  color: var(--text-color-primary);
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.prompt-content p {
  color: var(--text-color-secondary);
  font-size: 14px;
  margin: 0 0 20px 0;
  line-height: 1.5;
}

.publish-actions {
  padding: 1.5rem 0.75rem;
  gap: 0.75rem;
  flex-direction: column;
}

.publish-actions .draft-btn,
.publish-actions .publish-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 0.9rem;
}

@media (max-width: 480px) {
  .publish-header {
    padding: 16px 14px;
  }

  .page-title {
    margin-left: 12px;
  }

  .publish-content {
    padding: 1rem;
  }

  .publish-actions {
    padding: 1rem 0.5rem;
    gap: 0.5rem;
    flex-direction: column;
  }

  .publish-actions .draft-btn,
  .publish-actions .publish-btn {
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
  }
}
</style>
