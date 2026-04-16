export const MARKDOWN_THEME_STORAGE_KEY = 'markdownTheme'
export const MARKDOWN_THEME_CHANGE_EVENT = 'astrbot:markdown-theme-change'
export const DEFAULT_MARKDOWN_THEME = 'phycat-mint'
export const SUPPORTED_MARKDOWN_THEMES = ['phycat-mint', 'phycat-abyss']

export const normalizeMarkdownTheme = (theme) => {
  return SUPPORTED_MARKDOWN_THEMES.includes(theme) ? theme : DEFAULT_MARKDOWN_THEME
}

export const loadMarkdownTheme = () => {
  try {
    return normalizeMarkdownTheme(localStorage.getItem(MARKDOWN_THEME_STORAGE_KEY))
  } catch (error) {
    console.error('Failed to load markdown theme:', error)
    return DEFAULT_MARKDOWN_THEME
  }
}

export const saveMarkdownTheme = (theme) => {
  const normalizedTheme = normalizeMarkdownTheme(theme)

  try {
    localStorage.setItem(MARKDOWN_THEME_STORAGE_KEY, normalizedTheme)
  } catch (error) {
    console.error('Failed to save markdown theme:', error)
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MARKDOWN_THEME_CHANGE_EVENT, {
      detail: {
        theme: normalizedTheme
      }
    }))
  }

  return normalizedTheme
}
