<template>
  <div v-if="visible" class="modal-overlay" v-click-outside.mousedown="handleClose" v-escape-key="handleClose">
    <div class="modal" @mousedown.stop>
      <div class="modal-header">
        <h4>{{ title }}</h4>
        <button @click="handleClose" class="close-btn">
          <SvgIcon name="close" />
        </button>
      </div>
      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <div v-for="field in visibleFields" :key="field.key" class="form-group">
            <label>{{ field.label }}{{ field.required ? ' *' : '' }}:</label>
            <input v-if="field.type === 'text' || field.type === 'password'" :value="getInputValue(field)"
              @input="updateInputField(field, $event.target.value)" :type="field.type" :placeholder="field.placeholder"
              :required="field.required" :maxlength="field.maxlength" />
            <div v-else-if="field.type === 'textarea'" class="input-section">
              <div class="content-input-wrapper">
                <ContentEditableInput :ref="el => setContentEditableRef(field.key, el)" v-model="formData[field.key]"
                  :input-class="'content-textarea'" :placeholder="field.placeholder || '请输入内容'" :enable-mention="true"
                  :mention-users="mentionUsers" @mention="handleContentEditableMentionInput" />
                <div class="content-actions">
                  <button type="button" class="mention-btn" @click="toggleMentionPanel(field.key)">
                    <SvgIcon name="mention" class="mention-icon" width="20" height="20" />
                  </button>
                  <button type="button" class="emoji-btn" @click="toggleEmojiPanel(field.key)">
                    <SvgIcon name="emoji" class="emoji-icon" width="20" height="20" />
                  </button>
                </div>
              </div>
              <div v-if="field.maxLength" class="char-count">{{ getPlainTextLength(formData[field.key] || '') }}/{{
                field.maxLength }}</div>
            </div>
            <div v-else-if="field.type === 'textarea-with-emoji'" class="textarea-with-emoji-wrapper">
              <textarea :ref="el => setTextareaRef(field.key, el)" :value="getTextareaValue(field)"
                @input="updateTextareaField(field, $event.target.value)" :placeholder="field.placeholder"
                :required="field.required" rows="4" class="textarea-with-emoji"></textarea>
              <div class="textarea-actions">
                <button type="button" class="mention-btn" @click="toggleMentionPanel(field.key)">
                  <SvgIcon name="mention" class="mention-icon" width="20" height="20" />
                </button>
                <button type="button" class="emoji-btn" @click="toggleEmojiPanel(field.key)">
                  <SvgIcon name="emoji" class="emoji-icon" width="20" height="20" />
                </button>
                <div v-if="field.maxLength" class="char-count">{{ (getTextareaValue(field) || '').length }}/{{
                  field.maxLength }}</div>
              </div>
            </div>
            <div v-else-if="field.type === 'content-editable-input'" class="input-section">
              <div class="content-input-wrapper">
                <ContentEditableInput :ref="el => setContentEditableRef(field.key, el)" v-model="formData[field.key]"
                  :input-class="'content-textarea'" :placeholder="field.placeholder || '请输入内容'" :enable-mention="true"
                  :mention-users="mentionUsers" @mention="handleContentEditableMentionInput" />
                <div class="content-actions">
                  <button type="button" class="mention-btn" @click="toggleMentionPanel(field.key)">
                    <SvgIcon name="mention" class="mention-icon" width="20" height="20" />
                  </button>
                  <button type="button" class="emoji-btn" @click="toggleEmojiPanel(field.key)">
                    <SvgIcon name="emoji" class="emoji-icon" width="20" height="20" />
                  </button>
                </div>
              </div>
              <div v-if="field.maxLength" class="char-count">{{ getPlainTextLength(formData[field.key] || '') }}/{{
                field.maxLength }}</div>
            </div>
            <DropdownSelect v-else-if="field.type === 'select'"
              :model-value="formData[field.key] !== undefined && formData[field.key] !== null ? formData[field.key] : ''"
              @change="handleSelectChange(field.key, $event)" :options="field.options"
              :placeholder="field.required ? '请选择' : '请选择（可选）'" label-key="label" value-key="value" min-width="200px" />
            <input v-else-if="field.type === 'number'" :value="formData[field.key] || ''"
              @input="updateField(field.key, Number($event.target.value))" type="number"
              :placeholder="field.placeholder" :required="field.required" />
            <div v-else-if="field.type === 'checkbox'" class="checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" :checked="formData[field.key] || false"
                  @change="updateField(field.key, $event.target.checked)" />
                {{ field.checkboxLabel || '是' }}
              </label>
            </div>
            <div v-else-if="field.type === 'radio'" class="radio-group">
              <label v-for="option in field.options" :key="option.value" class="radio-label">
                <input type="radio" :name="field.key" :value="option.value"
                  :checked="formData[field.key] === option.value" @change="updateField(field.key, option.value)" />
                {{ option.label }}
              </label>
            </div>
            <div v-else-if="field.type === 'avatar-upload'" class="disabled-upload-notice">
              文本社区模式下已关闭后台头像上传，请改用外链地址或保留当前值。
            </div>
            <div v-else-if="field.type === 'multi-image-upload'" class="disabled-upload-notice">
              文本社区模式下已关闭后台图片上传，请改用外链内容。
            </div>
            <TagSelector v-else-if="field.type === 'tags'" :model-value="formData[field.key] || []"
              @update:model-value="updateField(field.key, $event)" :max-tags="field.maxTags || 10" />
            <div v-else-if="field.type === 'interest-input'" class="interest-input-container">
              <div class="interest-input-row">
                <input v-model="interestInput[field.key]" type="text" :placeholder="field.placeholder"
                  @keydown.enter.prevent="addInterest(field.key)" class="interest-input" />
                <button type="button" @click="addInterest(field.key)" class="add-interest-btn"
                  :disabled="!interestInput[field.key] || !interestInput[field.key].trim()">添加</button>
              </div>
              <div v-if="formData[field.key] && formData[field.key].length > 0" class="interest-tags">
                <span v-for="(interest, index) in formData[field.key]" :key="index" class="interest-tag">
                  {{ interest }}
                  <button type="button" @click="removeInterest(field.key, index)" class="remove-interest-btn">×</button>
                </span>
              </div>
            </div>
            <MbtiPicker v-else-if="field.type === 'mbti-picker'" :model-value="formData[field.key] || ''"
              @update:model-value="updateField(field.key, $event)" :dimensions="field.dimensions" />
            <div v-else-if="field.type === 'video-upload'" class="disabled-upload-notice">
              文本社区模式下已关闭后台视频上传，历史视频仅支持查看，不支持重新上传。
            </div>

          </div>
        </form>
      </div>
      <div class="modal-footer">
        <div class="form-actions">
          <button type="button" @click="handleClose" class="btn btn-outline">取消</button>
          <button type="button" @click="handleSubmit" class="btn btn-primary"
            :disabled="props.loading || isSubmitting">
            {{ getButtonText() }}
          </button>
        </div>
      </div>
    </div>
  </div>


  <div v-if="showEmojiPanel" class="emoji-panel-overlay" v-click-outside.mousedown="closeEmojiPanel"
    v-escape-key="closeEmojiPanel">
    <div class="emoji-panel" @mousedown.stop>
      <EmojiPicker @select="handleEmojiSelect" />
    </div>
  </div>
  <MentionModal :visible="showMentionPanel" @close="closeMentionPanel" @select="handleContentEditableMentionSelect" />
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import TagSelector from '@/components/TagSelector.vue'
import DropdownSelect from '@/components/DropdownSelect.vue'
import MbtiPicker from '@/components/MbtiPicker.vue'
import EmojiPicker from '@/components/EmojiPicker.vue'
import MentionModal from '@/components/mention/MentionModal.vue'
import ContentEditableInput from '@/components/ContentEditableInput.vue'
import messageManager from '@/utils/messageManager'
import { useScrollLock } from '@/composables/useScrollLock'
import { sanitizeContent } from '@/utils/contentSecurity'

const props = defineProps({
  visible: Boolean,
  title: String,
  formFields: {
    type: Array,
    default: () => []
  },
  formData: {
    type: Object,
    default: () => ({})
  },
  confirmText: {
    type: String,
    default: '确定'
  },
  loading: Boolean
})

const emit = defineEmits(['update:visible', 'update:formData', 'submit', 'close'])

// 防滚动穿透
const { lock, unlock } = useScrollLock()

const interestInput = ref({})
const textareaRefs = ref({})
const contentEditableRefs = ref({})
const showEmojiPanel = ref(false)
const showMentionPanel = ref(false)
const currentEmojiField = ref('')
const currentMentionField = ref('')

// 提及用户数据（实际使用中应该从 API 获取）
const mentionUsers = ref([])
const isSubmitting = ref(false)

// 计算可见字段
const visibleFields = computed(() => {
  return props.formFields.filter(field => {
    // 如果字段没有条件，直接显示
    if (!field.condition) return true

    // 检查条件是否满足
    const conditionField = field.condition.field
    const conditionValue = field.condition.value
    const currentValue = props.formData[conditionField]

    return currentValue === conditionValue
  })
})

const setTextareaRef = (fieldName, el) => {
  if (el) {
    textareaRefs.value[fieldName] = el
  } else {
    delete textareaRefs.value[fieldName]
  }
}

const setContentEditableRef = (fieldName, el) => {
  if (el) {
    contentEditableRefs.value[fieldName] = el
  } else {
    delete contentEditableRefs.value[fieldName]
  }
}

// 表情选择器相关方法
const toggleEmojiPanel = (fieldKey) => {
  currentEmojiField.value = fieldKey
  showEmojiPanel.value = !showEmojiPanel.value
}

const closeEmojiPanel = () => {
  showEmojiPanel.value = false
  currentEmojiField.value = ''
}

// mention选择器相关方法
const toggleMentionPanel = (fieldKey) => {
  // 如果要打开面板，先插入@符号
  if (!showMentionPanel.value) {
    const contentEditableRef = contentEditableRefs.value[fieldKey]
    if (contentEditableRef && contentEditableRef.insertAtSymbol) {
      contentEditableRef.insertAtSymbol()
    }
  }
  currentMentionField.value = fieldKey
  showMentionPanel.value = !showMentionPanel.value
}

const closeMentionPanel = () => {
  // 当关闭艾特选择模态框时，将输入框中带标记的@符号转换为纯文本
  const fieldKey = currentMentionField.value
  if (fieldKey) {
    const contentEditableRef = contentEditableRefs.value[fieldKey]
    if (contentEditableRef && contentEditableRef.convertAtMarkerToText) {
      contentEditableRef.convertAtMarkerToText()
    }
  }
  showMentionPanel.value = false
  currentMentionField.value = null
}


const handleEmojiSelect = (emoji) => {
  const emojiChar = emoji.i
  const fieldKey = currentEmojiField.value

  // 先尝试ContentEditableInput组件
  const contentEditableRef = contentEditableRefs.value[fieldKey]
  if (contentEditableRef && contentEditableRef.insertEmoji) {
    contentEditableRef.insertEmoji(emojiChar)
    closeEmojiPanel()
    return
  }

  // 如果不是ContentEditableInput，则处理普通textarea
  const inputElement = textareaRefs.value[fieldKey]
  if (inputElement && fieldKey) {
    const start = inputElement.selectionStart || 0
    const end = inputElement.selectionEnd || 0
    const currentValue = formData.value[fieldKey] || ''

    const newValue = currentValue.slice(0, start) + emojiChar + currentValue.slice(end)
    updateField(fieldKey, newValue)

    nextTick(() => {
      const newPosition = start + emojiChar.length
      // 确保元素获得焦点后再设置光标位置
      inputElement.focus()
      // 使用setTimeout确保DOM更新完成后设置光标位置
      setTimeout(() => {
        if (inputElement && typeof inputElement.setSelectionRange === 'function') {
          inputElement.setSelectionRange(newPosition, newPosition)
        }
      }, 0)
    })
  }

  closeEmojiPanel()
}

// 获取纯文本长度（去除HTML标签）
const getPlainTextLength = (htmlContent) => {
  if (!htmlContent) return 0
  // 创建临时div元素来获取纯文本内容
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  return tempDiv.textContent?.length || 0
}

const formData = computed(() => {
  return props.formData || {}
})

// 获取输入框的值
const getInputValue = (field) => {
  return formData.value[field.key] || ''
}

// 获取文本域的值
const getTextareaValue = (field) => {
  const value = formData.value[field.key]
  return value || ''
}

// 更新输入框字段
const updateInputField = (field, value) => {
  const newData = { ...props.formData }
  newData[field.key] = value
  emit('update:formData', newData)
}

// 更新文本域字段
const updateTextareaField = (field, value) => {
  const newData = { ...props.formData }
  newData[field.key] = value
  emit('update:formData', newData)
}

const updateField = (key, value) => {
  const newData = { ...props.formData }
  newData[key] = value
  emit('update:formData', newData)
}

// 处理DropdownSelect组件的change事件
const handleSelectChange = (key, data) => {
  updateField(key, data.value)
}

// ContentEditableInput的mention选择处理
const handleContentEditableMentionSelect = (user) => {
  // 获取当前活动的ContentEditableInput组件引用
  const fieldKey = currentMentionField.value
  const contentEditableRef = contentEditableRefs.value[fieldKey]

  if (contentEditableRef && contentEditableRef.selectMentionUser) {
    contentEditableRef.selectMentionUser(user)
  }

  // 关闭mention面板
  showMentionPanel.value = false
  currentMentionField.value = null
}

// ContentEditableInput的@符号输入处理
const handleContentEditableMentionInput = () => {
  // 当用户输入@符号时，自动打开mention面板
  if (!showMentionPanel.value) {
    showMentionPanel.value = true
    // 设置当前活动的字段（假设只有一个content-editable-input字段）
    const contentEditableFields = Object.keys(contentEditableRefs.value)
    if (contentEditableFields.length > 0) {
      currentMentionField.value = contentEditableFields[0]
    }
  }
}

// 监听模态框可见性变化
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    lock()
  } else {
    unlock()
  }
}, { immediate: true })

// 获取按钮文本
const getButtonText = () => {
  if (props.loading || isSubmitting.value) {
    return '提交中...'
  }

  return props.confirmText
}

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}



// 兴趣输入相关方法
const addInterest = (fieldKey) => {
  const input = interestInput.value[fieldKey]
  if (!input || !input.trim()) return

  const currentInterests = formData.value[fieldKey] || []
  const newInterest = input.trim()

  // 检查是否已存在
  if (currentInterests.includes(newInterest)) {
    interestInput.value[fieldKey] = ''
    return
  }

  const newData = { ...props.formData }
  newData[fieldKey] = [...currentInterests, newInterest]
  emit('update:formData', newData)

  // 清空输入框
  interestInput.value[fieldKey] = ''
}

const removeInterest = (fieldKey, index) => {
  const currentInterests = formData.value[fieldKey] || []
  const newInterests = currentInterests.filter((_, i) => i !== index)

  const newData = { ...props.formData }
  newData[fieldKey] = newInterests
  emit('update:formData', newData)
}



const handleSubmit = async () => {
  if (isSubmitting.value) {
    return
  }
  await handleFormSubmit()
}

// 处理表单提交
const handleFormSubmit = async () => {
  if (isSubmitting.value) {
    return
  }

  isSubmitting.value = true

  try {
    // 处理内容安全过滤
    const processedData = { ...props.formData }
    const contentFields = ['content', 'description', 'bio', 'introduction', 'summary']
    contentFields.forEach(field => {
      if (processedData[field]) {
        processedData[field] = sanitizeContent(processedData[field])
      }
    })

    // 视频数据处理：只对包含视频相关字段的表单进行处理
    const hasVideoFields = Object.prototype.hasOwnProperty.call(processedData, 'video_url') ||
      Object.prototype.hasOwnProperty.call(processedData, 'video_upload')

    if (hasVideoFields) {
      delete processedData.video_upload
      processedData.video = null
    }

    emit('submit', processedData)

  } catch (error) {
    console.error('表单提交失败:', error)
    messageManager.error(`提交失败: ${error.message}`)
  } finally {
    isSubmitting.value = false
  }
}

</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--overlay-bg);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-color-primary);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: background-color 0.2s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 1px solid var(--border-color-primary);
  flex-shrink: 0;
  background: var(--bg-color-primary);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.modal-header h4 {
  margin: 0;
  color: var(--text-color-primary);
}

.close-btn {
  background: var(--bg-color-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  border: none;
  cursor: pointer;
  padding: 5px;
  color: var(--text-color-primary);
}

.close-btn:hover {
  color: var(--text-color-secondary);
  transform: scale(1.1);
  transition: all 0.2s ease;
}

.close-btn svg {
  width: 16px;
  height: 16px;
}

.modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  /* 确保flex子元素可以收缩 */
}

.modal-footer {
  flex-shrink: 0;
  background: var(--bg-color-primary);
  border-top: 1px solid var(--border-color-primary);
  padding: 20px 30px;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: var(--text-color-primary);
}

.disabled-upload-notice {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-color-primary);
  background: var(--bg-color-secondary);
  color: var(--text-color-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
  background-color: var(--bg-color-primary);
  color: var(--text-color-primary);
  caret-color: var(--primary-color);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.form-group input:focus {
  border-color: var(--primary-color);
  outline: none;
}

.form-group textarea {
  resize: vertical;
}

.checkbox-group {
  margin-top: 8px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: normal;
  cursor: pointer;
  padding: 6px 0;
  font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
  padding: 0;
  transform: scale(1.1);
  accent-color: var(--primary-color);
}

.radio-group {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: normal;
  cursor: pointer;
  padding: 6px 0;
  font-size: 14px;
}

.radio-label input[type="radio"] {
  width: auto;
  margin: 0;
  padding: 0;
  transform: scale(1.1);
  accent-color: var(--primary-color);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin: 0;
}

/* 按钮样式 */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-color-dark);
}

.btn-outline {
  background-color: transparent;
  color: var(--text-color-secondary);
  border: 1px solid var(--border-color-primary);
}

.btn-outline:hover:not(:disabled) {
  background-color: var(--bg-color-secondary);
}

/* 兴趣输入样式 */
.interest-input-container {
  width: 100%;
}

.interest-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.interest-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 4px;
  font-size: 14px;
}

.add-interest-btn {
  padding: 8px 16px;
  background-color: var(--primary-color);
  color: var(--button-text-color);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
}

.add-interest-btn:hover:not(:disabled) {
  background-color: var(--primary-color);
  opacity: 0.9;
}

.add-interest-btn:disabled {
  background-color: var(--disabled-bg);
  cursor: not-allowed;
}

.interest-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.interest-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: var(--bg-color-secondary);
  border: 1px solid var(--border-color-primary);
  border-radius: 12px;
  font-size: 12px;
  color: var(--text-color-primary);
}

.remove-interest-btn {
  background: none;
  border: none;
  color: var(--text-color-secondary);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0;
  margin-left: 2px;
}

.remove-interest-btn:hover {
  color: var(--primary-color);
}

/* 带表情的textarea样式 */
.textarea-with-emoji-wrapper {
  position: relative;
  width: 100%;
}

.textarea-with-emoji {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color-primary);
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  padding-bottom: 40px;
  /* 为底部操作栏留出空间 */
}

/* ContentEditableInput样式 */
.input-section {
  position: relative;
  width: 100%;
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

.content-input-wrapper :deep(.content-textarea) {
  width: 100%;
  padding: 1rem;
  padding-bottom: 3rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-color-primary);
  font-size: 16px;
  line-height: 1.5;
  transition: all 0.2s ease;
  min-height: 120px;
  box-sizing: border-box;
  caret-color: var(--primary-color);
}

.content-input-wrapper :deep(.content-textarea:focus) {
  outline: none;
}

.content-input-wrapper :deep(.mention-link) {
  color: var(--text-color-tag);
  text-decoration: none;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;
  background: none;
  border: none;
  padding: 0;
  display: inline;
}

.content-input-wrapper :deep(.mention-link:hover) {
  color: var(--text-color-tag);
  opacity: 0.8;
}

.content-input-wrapper :deep(.mention-link:active) {
  color: var(--text-color-tag);
  opacity: 0.6;
}

.content-actions {
  position: absolute;
  bottom: 0.5rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.emoji-btn,
.mention-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-color-secondary, #999);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.emoji-btn:hover,
.mention-btn:hover {
  background: var(--bg-color-secondary);
  color: var(--text-color-primary);
}

.emoji-icon,
.mention-icon {
  width: 20px;
  height: 20px;
}

.input-section .char-count {
  position: absolute;
  bottom: 0.5rem;
  right: 0.75rem;
  font-size: 0.8rem;
  color: var(--text-color-secondary);
  background: var(--bg-color-primary);
  padding: 0.25rem;
  border-radius: 4px;
}

.textarea-actions {
  position: absolute;
  bottom: 8px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}



.emoji-icon,
.mention-icon {
  color: var(--text-color-secondary);
}

.char-count {
  font-size: 12px;
  color: var(--text-color-tertiary);
  white-space: nowrap;
}

/* 表情选择器面板样式 */
.emoji-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.2s ease;
}

.emoji-panel {
  background: var(--bg-color-primary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  animation: scaleIn 0.2s ease;
  max-width: 90vw;
  max-height: 90vh;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

</style>
