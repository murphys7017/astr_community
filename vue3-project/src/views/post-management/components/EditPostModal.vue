<template>
  <FormModal ref="formModalRef" :visible="visible" :title="modalTitle" :form-fields="formFields" :form-data="formData"
    :loading="saving" :confirm-text="getButtonText()" @update:visible="$emit('update:visible', $event)"
    @update:form-data="updateFormData" @submit="handleSave" @close="handleClose" />
  <MessageToast v-if="showToast" :message="toastMessage" :type="toastType" @close="handleToastClose" />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { updatePost, getPostDetail } from '@/api/posts'
import { getCategories } from '@/api/categories'
import FormModal from '@/views/admin/components/FormModal.vue'
import MessageToast from '@/components/MessageToast.vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  post: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:visible', 'save'])

// 响应式数据
const saving = ref(false)
const formModalRef = ref(null) // 添加FormModal引用

// 表单数据
const formData = ref({
  title: '',
  content: '',
  category: '',
  tags: []
})

// 消息提示
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success')

// 分类数据从API动态获取
const categories = ref([])

// 获取分类数据
const fetchCategories = async () => {
  try {
    const response = await getCategories()
    if (response.success) {
      categories.value = response.data.map(cat => ({
        value: cat.id,
        label: cat.name
      }))
    } else {
      console.error('获取分类数据失败')
      categories.value = []
    }
  } catch (error) {
    console.error('获取分类失败:', error)
    categories.value = []
  }
}

// 表单字段配置
const formFields = computed(() => {
  return [
    {
      key: 'title',
      label: '标题',
      type: 'text',
      placeholder: '请输入标题',
      required: true,
      maxLength: 100
    },
    {
      key: 'content',
      label: '内容',
      type: 'content-editable-input',
      placeholder: '请输入内容',
      required: true,
      maxLength: 2000
    },
    {
      key: 'category',
      label: '分类',
      type: 'select',
      placeholder: '请选择分类',
      options: categories.value,
      required: true
    },
    {
      key: 'tags',
      label: '标签 (最多10个)',
      type: 'tags',
      maxTags: 10
    }
  ]
})

// 更新表单数据
const updateFormData = (newData) => {
  // 使用合并而不是替换，保留现有数据
  formData.value = { ...formData.value, ...newData }
}

// 计算属性
const modalTitle = computed(() => {
  return '编辑笔记'
})

const canSave = computed(() => {
  return formData.value.title.trim() && formData.value.content.trim()
})

// 获取按钮文本
const getButtonText = () => {
  if (saving.value) {
    return '保存中...'
  }
  return '保存'
}

// 统一的数据处理方法
const processPostData = (data) => {
  const newData = {
    title: data.title || '',
    content: data.content || '',
    category: data.category || '',
    tags: data.tags || []
  }

  if (data.category && categories.value.length > 0) {
    const categoryItem = categories.value.find(cat => cat.label === data.category)
    newData.category = categoryItem ? categoryItem.value : ''
  }

  if (data.tags) {
    newData.tags = Array.isArray(data.tags)
      ? data.tags.map(tag => typeof tag === 'object' ? tag.name : tag)
      : []
  }

  return newData
}

// 初始化表单数据
const initializeForm = async (postData) => {
  // 确保分类数据已加载
  if (categories.value.length === 0) {
    await fetchCategories()
  }

  if (postData && postData.id) {
    try {
      // 获取完整的笔记详情
      const fullPost = await getPostDetail(postData.id)

      if (fullPost && fullPost.originalData) {
        const originalData = fullPost.originalData
        const processedData = processPostData({
          title: fullPost.title,
          content: originalData.content || fullPost.content,
          category: fullPost.category,
          tags: originalData.tags
        })

        formData.value = processedData
      } else {
        console.error('获取笔记详情失败: 数据格式不正确')
        formData.value = processPostData(postData)
      }
    } catch (error) {
      console.error('获取笔记详情失败:', error)
      formData.value = processPostData(postData)
    }
  } else {
    // 重置表单
    formData.value = processPostData({})
  }
}

// 合并监听：仅在可见且有有效 post.id 时初始化，或在 id 变化时重新初始化
watch(
  [() => props.visible, () => props.post && props.post.id],
  ([visible, id], [prevVisible, prevId]) => {
    if (!visible || !id) return
    // 当从关闭=>打开，或 post.id 变化时初始化
    if (!prevVisible || id !== prevId) {
      initializeForm(props.post)
    }
  },
  { immediate: true }
)

// 显示消息
const showMessage = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

// 关闭消息提示
const handleToastClose = () => {
  showToast.value = false
}

// 关闭模态框
const handleClose = () => {
  emit('update:visible', false)
}

// 组件挂载时获取分类数据
onMounted(() => {
  fetchCategories()
})

// 保存笔记
const handleSave = async (processedData) => {
  if (!canSave.value) {
    showMessage('请填写完整信息', 'error')
    return
  }
  if (saving.value) return

  // 直接保存
  await savePost(processedData)
}

// 保存笔记数据
const savePost = async (processedData) => {
  try {
    saving.value = true
    const postData = {
      title: (processedData.title || '').trim(),
      content: (processedData.content || '').trim(),
      category_id: processedData.category,
      tags: processedData.tags || []
    }

    const response = await updatePost(props.post.id, postData)
    if (response.success) {
      showMessage('保存成功', 'success')
      setTimeout(() => {
        emit('save')
      }, 100)
    } else {
      showMessage(response.message || '更新失败', 'error')
    }
  } catch (error) {
    console.error('更新失败:', error)
    showMessage('更新失败，请重试', 'error')
  } finally {
    saving.value = false
  }
}
</script>
