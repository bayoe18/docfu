/**
 * @fileoverview Frontmatter processing utilities for markdown files
 * Handles YAML frontmatter parsing, merging, and title extraction
 */

import {basename} from 'path'
import * as yaml from 'js-yaml'
import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkFrontmatter from 'remark-frontmatter'
import {visit} from 'unist-util-visit'
import {ALL_MARKDOWN_EXTENSIONS} from './patterns.js'

/**
 * Parse YAML frontmatter from content into object using AST
 * @param {string} content - Markdown content with frontmatter
 * @returns {Object|null} Parsed frontmatter object or null if none found
 */
export const parseFrontmatter = content => {
  if (!content) return null

  try {
    const tree = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).parse(content)

    let frontmatterYaml = null
    visit(tree, 'yaml', node => {
      frontmatterYaml = node.value
    })

    if (!frontmatterYaml) return null

    return yaml.load(frontmatterYaml) || {}
  } catch (e) {
    console.warn('Failed to parse frontmatter:', e)
    return {}
  }
}

/**
 * Convert frontmatter object to YAML string
 * @param {Object} obj - Frontmatter object to stringify
 * @returns {string} YAML string representation
 */
const stringifyFrontmatter = obj => {
  if (!obj || Object.keys(obj).length === 0) return ''
  return yaml.dump(obj, {lineWidth: -1, noRefs: true})
}

/**
 * Update content with new frontmatter using AST
 * Only modifies frontmatter and optionally removes H1, leaves rest of content unchanged
 * @param {string} content - Original markdown content
 * @param {Object} frontmatterObj - New frontmatter object to apply
 * @param {Object} options - Processing options
 * @param {boolean} options.removeH1 - Whether to remove first H1 heading
 * @returns {Promise<string>} Updated content with new frontmatter
 */
const updateContentFrontmatter = async (content, frontmatterObj, options = {}) => {
  const tree = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).parse(content)

  const frontmatterYaml = stringifyFrontmatter(frontmatterObj)
  let yamlEndOffset = 0
  let contentStartOffset = 0

  visit(tree, 'yaml', node => {
    if (node.position) {
      yamlEndOffset = node.position.end.offset
      contentStartOffset = yamlEndOffset
    }
  })

  let bodyContent = contentStartOffset > 0 ? content.slice(contentStartOffset) : content

  if (options.removeH1) bodyContent = bodyContent.replace(/^#\s+.+$/m, '')

  bodyContent = bodyContent.trimStart()

  return `---\n${frontmatterYaml}---\n\n${bodyContent}`
}

/**
 * Extract title from content H1 header or generate from filename
 * @param {string} path - File path to extract title from
 * @param {string} content - Markdown content to check for H1 header
 * @returns {string} Extracted or generated title
 */
export const getTitle = (path, content) => {
  const header = content?.match(/^#\s+(.+)$/m)?.at(1)
  if (header) return header.trim()

  const filename = basename(path).replace(ALL_MARKDOWN_EXTENSIONS, '')
  if (filename.toUpperCase() === 'README') return 'Overview'
  return filename.replace(/[-_]/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

/**
 * Merge existing frontmatter with default values
 * @param {Object} existing - Existing frontmatter object
 * @param {Object} defaults - Default frontmatter values
 * @returns {Object} Merged frontmatter object with existing taking precedence
 */
export const mergeFrontmatter = (existing, defaults) => {
  const merged = {...defaults}

  for (const key in existing) {
    if (existing[key] !== undefined) {
      if (
        typeof existing[key] === 'object' &&
        !Array.isArray(existing[key]) &&
        typeof defaults[key] === 'object' &&
        !Array.isArray(defaults[key])
      ) {
        merged[key] = {...defaults[key], ...existing[key]}
      } else {
        merged[key] = existing[key]
      }
    }
  }
  return merged
}

/**
 * Ensure frontmatter has a title, adding one if missing
 * @param {string} path - File path for title generation
 * @param {string} content - Markdown content to process
 * @param {Object} options - Additional processing options
 * @param {boolean} options.isHidden - Whether the file is in a hidden directory
 * @returns {Promise<string>} Content with title ensured in frontmatter
 */
export const ensureTitle = async (path, content, options = {}) => {
  const existingFrontmatter = parseFrontmatter(content) || {}

  if (options.isHidden) {
    existingFrontmatter.pagefind = false
    existingFrontmatter.sidebar = existingFrontmatter.sidebar || {}
    existingFrontmatter.sidebar.hidden = true
  }

  if (existingFrontmatter.title && !options.isHidden) return content

  if (!existingFrontmatter.title) existingFrontmatter.title = getTitle(path, content)

  return updateContentFrontmatter(content, existingFrontmatter, {removeH1: true})
}

/**
 * Merge frontmatter with hierarchical config (directory defaults + file-specific)
 * @param {string} path - File path for title generation and config lookup
 * @param {string} content - Markdown content to process
 * @param {Object} options - Processing options
 * @param {Array} options.hierarchicalConfigs - Hierarchical configs from discover
 * @param {string} options.sourceDir - Source directory root
 * @param {boolean} options.isHidden - Whether file is in hidden directory
 * @returns {Promise<string>} Content with merged frontmatter
 */
export const mergeFrontmatterWithHierarchicalConfig = async (path, content, options = {}) => {
  const {hierarchicalConfigs, sourceDir} = options

  if (!hierarchicalConfigs || !sourceDir) return ensureTitle(path, content, options)

  const {getApplicable} = await import('./config.js')
  const {defaults, fileSpecific} = getApplicable(hierarchicalConfigs, sourceDir, path)
  const existingFrontmatter = parseFrontmatter(content) || {}

  let mergedFrontmatter = {...defaults}
  mergedFrontmatter = mergeFrontmatter(mergedFrontmatter, existingFrontmatter)
  if (fileSpecific) mergedFrontmatter = mergeFrontmatter(mergedFrontmatter, fileSpecific)

  if (options.isHidden) {
    mergedFrontmatter.pagefind = false
    mergedFrontmatter.sidebar = mergedFrontmatter.sidebar || {}
    mergedFrontmatter.sidebar.hidden = true
  }

  if (options.isUnlisted) mergedFrontmatter.pagefind = false

  if (!mergedFrontmatter.title) mergedFrontmatter.title = getTitle(path, content)

  return updateContentFrontmatter(content, mergedFrontmatter, {removeH1: true})
}
