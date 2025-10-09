/**
 * @fileoverview Markdown to MDX conversion with smart auto-import
 * Detects JSX components and auto-imports from custom components or Starlight
 */

import {unified} from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'
import {visit} from 'unist-util-visit'
import {extractJSXComponents} from './jsx.js'
import {DOCFU_COMPONENTS} from './components.js'

/**
 * Extract component names from existing import statements (fallback method)
 * Uses AST to filter code blocks, then regex to extract imports
 * More forgiving than full MDX parsing when content has syntax errors
 * @param {string} content - File content to scan for imports
 * @returns {Set<string>} Set of already-imported component names
 */
function extractImportsFallback(content) {
  const imported = new Set()

  // Use AST parsing to strip code blocks first (respects code fences)
  let contentWithoutCode = content
  try {
    const tree = unified().use(remarkParse).parse(content)
    const textParts = []

    visit(tree, node => {
      if (node.type === 'code' || node.type === 'inlineCode') return

      if (node.type === 'text' || node.type === 'paragraph') if (node.value) textParts.push(node.value)
    })

    contentWithoutCode = textParts.join('\n')
  } catch {
    // If AST parsing fails completely, proceed with original content
    // (less safe but better than returning nothing)
  }

  // Match: import Component from 'path'
  const defaultImports = contentWithoutCode.matchAll(/import\s+(\w+)\s+from\s+['"][^'"]+['"]/g)
  for (const match of defaultImports) {
    imported.add(match[1])
  }

  // Match: import { Component1, Component2 } from 'path'
  const namedImports = contentWithoutCode.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"]/g)
  for (const match of namedImports) {
    const names = match[1].split(',').map(n =>
      n
        .trim()
        .split(/\s+as\s+/)[0]
        .trim()
    )
    names.forEach(name => imported.add(name))
  }

  return imported
}

/**
 * Extract component names from existing import statements using AST parsing
 * Respects MDX structure - more reliable than regex
 * @param {string} content - File content to scan for imports
 * @returns {Set<string>} Set of already-imported component names
 * @example
 * extractExistingImports('import Foo from "./foo"\nimport { Bar, Baz } from "lib"')
 * // Returns: Set(['Foo', 'Bar', 'Baz'])
 */
function extractExistingImports(content) {
  const imported = new Set()

  try {
    const tree = unified().use(remarkParse).use(remarkMdx).parse(content)

    // Visit mdxjsEsm nodes (ESM import/export statements in MDX)
    visit(tree, 'mdxjsEsm', node => {
      // The node.data.estree contains the ESTree AST for the import statement
      if (!node.data?.estree?.body) return

      for (const statement of node.data.estree.body) {
        if (statement.type !== 'ImportDeclaration') continue

        for (const specifier of statement.specifiers || []) {
          // import Foo from 'path'
          if (specifier.type === 'ImportDefaultSpecifier') imported.add(specifier.local.name)
          // import { Foo } from 'path' or import { Foo as Bar } from 'path'
          else if (specifier.type === 'ImportSpecifier') imported.add(specifier.local.name)
        }
      }
    })

    return imported
  } catch (error) {
    // Silent fallback - regex method works fine for most cases
    // Only log if explicitly debugging MDX parsing issues
    if (process.env.DEBUG_MDX) {
      console.warn(`→ Import AST parsing fallback: ${error.message}`)
    }
    return extractImportsFallback(content)
  }
}

/**
 * Process markdown to MDX with smart component auto-import
 * Extracts JSX component names and generates appropriate import statements
 * Priority: custom components > DocFu components > Starlight components
 * Skips components that are already manually imported
 *
 * @param {string} filename - The filename being processed
 * @param {string} content - The file content to process
 * @param {Object} options - Processing options
 * @param {Array} options.customComponents - Custom components discovered from workspace
 * @returns {string} Content with auto-generated import statements
 *
 * @example
 * // With custom, DocFu, and Starlight components
 * process('page.md', '<Card /><InlineIcon /><MyCustom />', {
 *   customComponents: [{name: 'MyCustom', path: 'components/MyCustom.astro'}]
 * })
 * // Returns:
 * // import MyCustom from '../../components/MyCustom.astro'
 * // import InlineIcon from '../engine/src/components/InlineIcon.astro'
 * // import { Card } from '@astrojs/starlight/components'
 * //
 * // <Card /><InlineIcon /><MyCustom />
 */
export function process(filename, content, options = {}) {
  const components = extractJSXComponents(content, filename)
  if (components.length === 0) return content

  const alreadyImported = extractExistingImports(content)
  const needsImport = components.filter(name => !alreadyImported.has(name))

  if (needsImport.length === 0) return content

  const {customComponents = []} = options
  const customNames = new Set(customComponents.map(c => c.name))
  const docfuNames = new Set(DOCFU_COMPONENTS)

  const custom = needsImport.filter(name => customNames.has(name))
  const docfu = needsImport.filter(name => docfuNames.has(name))
  const starlight = needsImport.filter(name => !customNames.has(name) && !docfuNames.has(name))

  let imports = ''

  for (const name of custom) {
    const component = customComponents.find(c => c.name === name)
    imports += `import ${name} from '../../${component.path}'\n`
  }

  for (const name of docfu) {
    imports += `import ${name} from '../engine/src/components/${name}.astro'\n`
  }

  if (starlight.length > 0) {
    imports += `import { ${starlight.join(', ')} } from '@astrojs/starlight/components'\n`
  }

  return imports ? imports + '\n' + content : content
}
