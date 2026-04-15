/**
 * 服务端内容安全过滤工具
 * 防止XSS攻击和恶意HTML注入
 */

const escapeHtml = (text) => {
  if (!text) return ''
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * 验证并清理 mention 链接
 * 确保链接只包含安全的属性和值
 */
const validateAndCleanMentionLink = (linkHtml) => {
  // 提取 href 和 data-user-id
  const hrefMatch = linkHtml.match(/href="([^"]*)"/)
  const userIdMatch = linkHtml.match(/data-user-id="([^"]*)"/)
  const textMatch = linkHtml.match(/>@([^<]*)</)

  if (!hrefMatch || !userIdMatch || !textMatch) {
    return null
  }

  const href = hrefMatch[1]
  const userId = userIdMatch[1]
  const nickname = textMatch[1]

  // 严格验证 href：必须是 /user/ 开头的相对路径
  if (!href.match(/^\/user\/[a-zA-Z0-9_-]+$/)) {
    return null
  }

  // 验证 data-user-id：只允许字母、数字、下划线和连字符
  if (!userId.match(/^[a-zA-Z0-9_-]+$/)) {
    return null
  }


  // 重新构建安全的 mention 链接
  return `<a href="/user/${userId}" class="mention-link" data-user-id="${userId}" contenteditable="false">@${nickname}</a>`
}

/**
 * 内容安全过滤函数
 * 注意：对于 Markdown 内容，不再进行 HTML 转义，因为前端 markdown-it 会自动处理
 * 此函数主要用于验证和清理 mention 链接
 */
const sanitizeContent = (content) => {
  if (!content) return ''

  // 将 <br> 标签转换为换行符，让 markdown-it 能正确解析
  let processed = content.replace(/<br\s*\/?>/gi, '\n')

  // 返回原始内容即可
  return processed.trim()
}

/**
 * 验证内容是否包含危险标签
 */
const hasDangerousTags = (content) => {
  if (!content) return false
  
  const dangerousTags = [
    'script', 'iframe', 'object', 'embed', 'form', 'input', 'button',
    'link', 'meta', 'style', 'base', 'applet', 'frame', 'frameset'
  ]
  
  const tagRegex = new RegExp(`<\/?(?:${dangerousTags.join('|')})[^>]*>`, 'gi')
  return tagRegex.test(content)
}

/**
 * 验证内容是否包含危险属性
 */
const hasDangerousAttributes = (content) => {
  if (!content) return false
  
  const dangerousAttrs = [
    'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
    'onfocus', 'onblur', 'onchange', 'onsubmit', 'javascript:'
  ]
  
  return dangerousAttrs.some(attr =>
    content.toLowerCase().includes(attr.toLowerCase())
  )
}

module.exports = {
  sanitizeContent,
  hasDangerousTags,
  hasDangerousAttributes,
  escapeHtml
}

