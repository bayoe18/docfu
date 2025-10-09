/**
 * @fileoverview AST-based markdown transformation utilities
 * Uses unified/remark for reliable parsing and transformation
 */

import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import {visit} from 'unist-util-visit'

/**
 * Transform README links to index links in markdown content
 * Handles: README.md, readme.md, README.mdx, readme.mdoc (case-insensitive)
 * Preserves: Links in code blocks, inline code, and escaped content
 * @param {string} content - Markdown content
 * @returns {Promise<string>} Content with README links transformed to index links
 */
export const transformReadmeLinks = async content => {
  if (!/(readme|README|Readme)\.(md|mdx|mdoc)/i.test(content)) return content
  const processor = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml'])
    .use(() => tree => {
      visit(tree, 'link', node => {
        if (node.url) {
          node.url = node.url.replace(/\/(readme|README|Readme)\.(md|mdx|mdoc)$/, '/index.$2')
          node.url = node.url.replace(/^(readme|README|Readme)\.(md|mdx|mdoc)$/, 'index.$2')
        }
      })

      visit(tree, 'definition', node => {
        if (node.url) {
          node.url = node.url.replace(/\/(readme|README|Readme)\.(md|mdx|mdoc)$/, '/index.$2')
          node.url = node.url.replace(/^(readme|README|Readme)\.(md|mdx|mdoc)$/, 'index.$2')
        }
      })

      visit(tree, 'html', node => {
        if (node.value && node.value.includes('href')) {
          node.value = node.value.replace(
            /(<a\s+[^>]*href=["'])([^"']*)(readme|README|Readme)\.(md|mdx|mdoc)([^"']*["'])/gi,
            (match, prefix, path, readme, ext, suffix) => {
              const newPath = path.replace(/\/$/, '') + (path ? '/' : '') + `index.${ext}`
              return prefix + newPath + suffix
            }
          )
        }
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
