import { marked } from 'marked'

/**
 * Detects if content is HTML by checking for common HTML tags
 */
function isHTML(str: string): boolean {
  if (!str) return false
  const htmlPattern = /<\/?[a-z][\s\S]*>/i
  return htmlPattern.test(str)
}

/**
 * Converts content to HTML format for TipTap editor
 * - If already HTML, returns as-is
 * - If markdown, converts to HTML
 * - If plain text, wraps in paragraph tags
 */
export function toHTML(content: string): string {
  if (!content) return '<p></p>'

  // If it's already HTML, return as-is
  if (isHTML(content)) {
    return content
  }

  // Check if it looks like markdown (has markdown patterns)
  const markdownPatterns = [
    /^#{1,6}\s/m, // Headers
    /\*\*[^*]+\*\*/, // Bold
    /\*[^*]+\*/, // Italic
    /^\s*[-*+]\s/m, // Lists
    /^\s*\d+\.\s/m, // Numbered lists
    /\[([^\]]+)\]\([^)]+\)/, // Links
    /^>/m, // Blockquotes
  ]

  const hasMarkdown = markdownPatterns.some((pattern) => pattern.test(content))

  if (hasMarkdown) {
    // Convert markdown to HTML
    return marked.parse(content) as string
  }

  // Plain text - convert line breaks to paragraphs
  const paragraphs = content
    .split(/\n\n+/)
    .filter((p) => p.trim())
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')

  return paragraphs || '<p></p>'
}

/**
 * Extracts plain text from HTML content
 */
export function toPlainText(html: string): string {
  if (!html) return ''

  // Remove HTML tags
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
