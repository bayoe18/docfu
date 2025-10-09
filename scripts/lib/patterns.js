/**
 * @fileoverview Comprehensive file extension patterns and content matching utilities
 * Provides regex patterns for markdown formats and content detection functions
 */

// Plain markdown extensions that can be converted to .mdx or .mdoc
// Based on: https://github.com/sindresorhus/markdown-extensions/blob/main/markdown-extensions.json
export const CONVERTIBLE_MARKDOWN_EXTENSIONS = /\.(md|markdown|mdown|mkdn|mkd|mdwn|mdtxt|mdtext|text|txt)$/i

export const ALL_MARKDOWN_EXTENSIONS = /\.(md|markdown|mdown|mkdn|mkd|mdwn|mdtxt|mdtext|text|txt|mdx|mdoc|markdoc)$/i

/**
 * Content pattern matching
 */

// MDX-specific patterns (used for external library parsing only)
export const MDX_EXPORT = /export\s+{\s*(?:default\s+as\s+)?(\w+)\s*}/g

export const COMPONENT_TAG = component => new RegExp(`<${component}(?:\\s|>|/)`, 'g')

/**
 * Convert between extension types
 * @param {string} filename - Original filename
 * @param {string} targetType - Target type: 'mdx', 'markdoc', or 'markdown'
 * @returns {string} Filename with converted extension
 */
export const convertExtension = (filename, targetType) => {
  const baseName = filename.replace(ALL_MARKDOWN_EXTENSIONS, '')

  switch (targetType) {
    case 'mdx':
      return `${baseName}.mdx`
    case 'markdoc':
      return `${baseName}.mdoc`
    case 'markdown':
      return `${baseName}.md`
    default:
      return filename
  }
}
