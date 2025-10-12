/**
 * @fileoverview Syntax detection and format routing utilities
 * Detects JSX and Markdoc syntax for appropriate conversion
 */

import {hasJSXSyntax} from './jsx.js'
import {CONVERTIBLE_MARKDOWN_EXTENSIONS, convertExtension} from './patterns.js'

const MARKDOC_TAG = /\{%\s+\w+[^%]*%\}/
const HEADING_BADGE = /^#{1,6}\s+.*:badge\[[^\]]*\]/m

/**
 * Check if content uses Markdoc syntax or needs markdoc conversion
 * @param {string} content - The content to check
 * @returns {boolean} - True if content contains or needs Markdoc syntax
 */
export const usesMarkdocSyntax = content => MARKDOC_TAG.test(content) || HEADING_BADGE.test(content)

/**
 * Detect the syntax type used in markdown content
 * @param {string} content - The file content to analyze
 * @returns {'mdx'|'markdoc'|'markdown'} - The detected syntax type
 */
export const detectSyntax = content => {
  if (hasJSXSyntax(content)) return 'mdx'
  if (usesMarkdocSyntax(content)) return 'markdoc'
  return 'markdown'
}

/**
 * Determine target conversion format for a file
 * @param {string} filename - The original filename
 * @param {string} content - The file content
 * @returns {{format: string, shouldConvert: boolean}}
 */
export const getTargetFormat = (filename, content) => {
  if (!filename.match(CONVERTIBLE_MARKDOWN_EXTENSIONS)) return {format: 'unchanged', shouldConvert: false}
  if (filename.includes('node_modules')) return {format: 'markdown', shouldConvert: false}

  const syntax = detectSyntax(content)

  if (syntax === 'mdx') return {format: 'mdx', shouldConvert: true}
  if (syntax === 'markdoc') return {format: 'markdoc', shouldConvert: true}
  return {format: 'markdown', shouldConvert: false}
}

/**
 * Get appropriate file extension based on target format
 * @param {string} originalFilename - The original filename
 * @param {string} targetFormat - The target format ('mdx', 'markdoc', or 'markdown')
 * @returns {string} - The new filename with appropriate extension
 */
export const getTargetExtension = (originalFilename, targetFormat) => {
  if (!originalFilename.match(CONVERTIBLE_MARKDOWN_EXTENSIONS)) return originalFilename
  return convertExtension(originalFilename, targetFormat)
}
