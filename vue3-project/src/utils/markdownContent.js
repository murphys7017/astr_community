const CUSTOM_BLOCK_LINE_REGEX = /^\[::(\w+)\]\((https?:\/\/[^\s)]+)\)$/
const FENCE_START_REGEX = /^ {0,3}(`{3,}|~{3,})(.*)$/

const escapeRegExp = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const getFenceStart = (line) => {
  const match = line.match(FENCE_START_REGEX)
  if (!match) {
    return null
  }

  return {
    marker: match[1][0],
    length: match[1].length
  }
}

const isFenceEnd = (line, fenceState) => {
  if (!fenceState) {
    return false
  }

  const closingRegex = new RegExp(`^ {0,3}${escapeRegExp(fenceState.marker)}{${fenceState.length},}\\s*$`)
  return closingRegex.test(line)
}

export const splitMarkdownContent = (content, parentUrls = new Set()) => {
  if (!content) {
    return []
  }

  const lines = String(content).split(/\r?\n/)
  const segments = []
  let markdownLines = []
  let fenceState = null

  const flushMarkdown = () => {
    if (markdownLines.length === 0) {
      return
    }

    const text = markdownLines.join('\n').trim()
    if (text) {
      segments.push({
        type: 'markdown',
        content: text
      })
    }

    markdownLines = []
  }

  for (const line of lines) {
    if (fenceState) {
      markdownLines.push(line)
      if (isFenceEnd(line, fenceState)) {
        fenceState = null
      }
      continue
    }

    const nextFenceState = getFenceStart(line)
    if (nextFenceState) {
      markdownLines.push(line)
      fenceState = nextFenceState
      continue
    }

    const customBlockMatch = line.match(CUSTOM_BLOCK_LINE_REGEX)
    if (!customBlockMatch) {
      markdownLines.push(line)
      continue
    }

    flushMarkdown()

    const [, blockType, url] = customBlockMatch
    if (blockType === 'md') {
      segments.push({
        type: 'remote-md',
        url,
        parentUrls
      })
      continue
    }

    if (blockType === 'video') {
      segments.push({
        type: 'video',
        url
      })
      continue
    }

    markdownLines.push(line)
  }

  flushMarkdown()
  return segments
}

export const stripStandaloneCustomBlocks = (content) => {
  if (!content) {
    return ''
  }

  const lines = String(content).split(/\r?\n/)
  const filteredLines = []
  let fenceState = null

  for (const line of lines) {
    if (fenceState) {
      filteredLines.push(line)
      if (isFenceEnd(line, fenceState)) {
        fenceState = null
      }
      continue
    }

    const nextFenceState = getFenceStart(line)
    if (nextFenceState) {
      filteredLines.push(line)
      fenceState = nextFenceState
      continue
    }

    if (CUSTOM_BLOCK_LINE_REGEX.test(line)) {
      continue
    }

    filteredLines.push(line)
  }

  return filteredLines.join('\n')
}
