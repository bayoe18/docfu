/**
 * @fileoverview Generic JSX syntax detection
 * Framework-agnostic detection of JSX component usage using AST parsing
 */

import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import {visit} from 'unist-util-visit'

// Fallback regex pattern for when AST parsing fails
const JSX_COMPONENT_PATTERN = /<[A-Z][A-Za-z0-9]*[\s/>]/

/**
 * Check if content contains JSX component syntax
 * Detects PascalCase component tags (framework-agnostic)
 * @param {string} content - The content to check
 * @returns {boolean} True if content contains JSX components
 */
export function hasJSXSyntax(content) {
  return extractJSXComponents(content).length > 0
}

/**
 * Extract JSX component names using regex (fallback method)
 * @param {string} content - The content to scan
 * @returns {string[]} Sorted array of unique component names
 */
function extractComponentsRegex(content) {
  const components = new Set()
  const pattern = /<([A-Z][A-Za-z0-9]*)/g
  let match

  while ((match = pattern.exec(content)) !== null) {
    components.add(match[1])
  }

  return Array.from(components).sort()
}

/**
 * Extract all JSX component names from content using AST parsing
 * Respects markdown structure - skips code blocks, inline code, etc.
 * More reliable than regex as it understands MDX syntax properly
 * @param {string} content - The content to scan for components
 * @param {string} filePath - Optional file path for better error messages
 * @returns {string[]} Sorted array of unique component names
 * @example
 * extractJSXComponents('<Card><Badge /></Card>')
 * // Returns: ['Badge', 'Card']
 */
export function extractJSXComponents(content, filePath = '') {
  const components = new Set()

  try {
    const tree = unified().use(remarkParse).use(remarkMdx).parse(content)

    visit(tree, 'mdxJsxFlowElement', node => {
      if (node.name && /^[A-Z]/.test(node.name)) components.add(node.name)
    })

    visit(tree, 'mdxJsxTextElement', node => {
      if (node.name && /^[A-Z]/.test(node.name)) components.add(node.name)
    })

    return Array.from(components).sort()
  } catch (error) {
    // Silent fallback - regex method works fine for most cases
    // Only log if explicitly debugging MDX parsing issues
    if (process.env.DEBUG_MDX) {
      console.warn(`→ MDX parsing fallback${filePath ? ` (${filePath})` : ''}: ${error.message}`)
    }
    return extractComponentsRegex(content)
  }
}
