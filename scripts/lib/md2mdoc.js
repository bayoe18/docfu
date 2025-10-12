/**
 * Convert Markdown with Markdoc syntax to .mdoc format
 * Handles GitHub alerts, remark directive badges, and existing Markdoc tags
 */

import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import {visit} from 'unist-util-visit'

const ALERT_TYPES = {
  NOTE: 'note',
  TIP: 'tip',
  IMPORTANT: 'caution',
  WARNING: 'caution',
  CAUTION: 'danger',
}

// Regex patterns for badge syntax (custom syntax, not standard markdown)
// Note: Handles both :badge[text] and :badge\[text] (escaped by remark-stringify)
const BADGE_PATTERN = /:badge\\?\[([^\]]*?)\\?\](?:\{([^}]+)\})?/g
const ATTRIBUTE_PATTERN = /(\w+)=(\w+)/g

/**
 * Convert GitHub alerts to Markdoc aside tags using AST
 * @param {string} content - The markdown content
 * @returns {Promise<string>} Content with GitHub alerts converted to markdoc asides
 */
const convertGitHubAlerts = async content => {
  if (!/>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.test(content)) return content
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(() => tree => {
      visit(tree, 'blockquote', (node, index, parent) => {
        if (!node.children?.[0] || node.children[0].type !== 'paragraph') return

        const firstPara = node.children[0]
        const firstChild = firstPara.children?.[0]

        if (!firstChild || firstChild.type !== 'text') return

        const alertMatch = firstChild.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/)
        if (!alertMatch) return

        const alertType = alertMatch[1]
        const markdocType = ALERT_TYPES[alertType]

        firstChild.value = firstChild.value.slice(alertMatch[0].length)

        // If the first text node is now empty and it's the only child, remove the entire first paragraph
        if (firstChild.value === '' && firstPara.children.length === 1) {
          node.children.shift()
        }

        // Convert blockquote to Markdoc aside (using html node as workaround)
        // We'll serialize the children and wrap in aside tags
        const childProcessor = unified().use(remarkStringify, {
          bullet: '-',
          emphasis: '_',
          fences: true,
          incrementListMarker: false,
        })

        const childContent = node.children
          .map(child => childProcessor.stringify({type: 'root', children: [child]}))
          .join('')
          .trim()

        const asideNode = {
          type: 'html',
          value: `{% aside type="${markdocType}" %}\n${childContent}\n{% /aside %}`,
        }

        parent.children[index] = asideNode
      })
    })
    .use(remarkStringify, {
      bullet: '-',
      emphasis: '_',
      fences: true,
      incrementListMarker: false,
    })

  const result = await processor.process(content)
  return String(result)
}

/**
 * Convert badge syntax to Markdoc badges
 * @param {string} text - The text containing badges
 * @returns {string} Text with badges converted to markdoc
 */
const convertBadges = text =>
  text.replace(BADGE_PATTERN, (match, text, attrs = '') => {
    const props = [`text="${text}"`]
    attrs.match(ATTRIBUTE_PATTERN)?.forEach(pair => {
      const [key, val] = pair.split('=')
      const propKey = key === 'type' ? 'variant' : key
      if (['variant', 'size'].includes(propKey)) props.push(`${propKey}="${val}"`)
    })
    return `{% badge ${props.join(' ')} /%}`
  })

/**
 * Convert heading badges to Markdoc badge tags
 * @param {string} content - The markdown content
 * @returns {string} Content with :badge[text] in headers converted to markdoc badges
 */
const convertHeadingBadges = content =>
  content
    .split('\n')
    .map(line => {
      if (/^#{1,6}\s/.test(line)) {
        return line.replace(BADGE_PATTERN, (match, text, attrs = '') => {
          const props = [`text="${text}"`]
          attrs.match(ATTRIBUTE_PATTERN)?.forEach(pair => {
            const [key, val] = pair.split('=')
            const propKey = key === 'type' ? 'variant' : key
            if (['variant', 'size'].includes(propKey)) props.push(`${propKey}="${val}"`)
          })
          return `{% badge ${props.join(' ')} /%}`
        })
      }
      return line
    })
    .join('\n')

/**
 * Process a markdown file for Markdoc conversion
 * @param {string} filePath - Path to the destination file (will be changed to .mdoc)
 * @param {string} content - The file content
 * @returns {Promise<string>} The processed content
 */
export const process = async (filePath, content) => {
  let result = content

  result = await convertGitHubAlerts(result)
  result = convertHeadingBadges(result)

  // Also convert badges in frontmatter title
  const frontmatterMatch = result.match(/^---\n([\s\S]*?)\n---/m)
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1]
    const titleMatch = frontmatter.match(/^title:\s*(.+)$/m)
    if (titleMatch && titleMatch[1].includes(':badge[')) {
      const convertedTitle = convertBadges(titleMatch[1])
      result = result.replace(titleMatch[0], `title: ${convertedTitle}`)
    }
  }

  return result
}
