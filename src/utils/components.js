/**
 * Component utilities
 *
 * This module contains component-related utilities including:
 * - Starlight component discovery and filtering
 * - Component prop extraction
 */

import {existsSync, readdirSync, readFileSync} from 'fs'
import {createRequire} from 'module'
import {join} from 'path'

const require = createRequire(import.meta.url)

let starlightThemeComponents = null

/**
 * Dynamically discover Starlight theme components (for overriding)
 * @returns {Array<string>} Array of Starlight theme component names
 */
export function getStarlightThemeComponents() {
  if (starlightThemeComponents) return starlightThemeComponents

  try {
    const componentsDir = require.resolve('@astrojs/starlight/components')
    const componentsPath = componentsDir.replace('/components.ts', '/components')
    const files = readdirSync(componentsPath)

    const components = files.filter(f => f.endsWith('.astro')).map(f => f.replace('.astro', ''))

    starlightThemeComponents = components
    return components
  } catch (error) {
    starlightThemeComponents = [
      'Header',
      'Footer',
      'Sidebar',
      'SiteTitle',
      'Hero',
      'Head',
      'Page',
      'PageFrame',
      'PageSidebar',
      'PageTitle',
      'Pagination',
      'Search',
      'SocialIcons',
      'TableOfContents',
      'ThemeSelect',
      'ThemeProvider',
    ]
  }

  return starlightThemeComponents
}

/**
 * Filter manifest components to only Starlight theme overrides
 * @param {Array} components - Array of component metadata from manifest
 * @returns {Object} Object mapping component names to file paths for overrides
 */
export function getStarlightOverrides(components) {
  if (!components || !Array.isArray(components)) return {}

  const starlightThemeComponents = getStarlightThemeComponents()

  const overrides = {}
  for (const component of components) {
    if (starlightThemeComponents.includes(component.name)) {
      overrides[component.name] = `../workspace/${component.path}`
    }
  }

  return overrides
}

/**
 * Filter manifest components to only custom components (excluding Starlight overrides)
 * @param {Array} components - Array of component metadata from manifest
 * @returns {Array} Array of custom component metadata objects
 */
export function getCustomComponents(components) {
  if (!components || !Array.isArray(components)) return []

  const starlightThemeComponents = getStarlightThemeComponents()

  return components.filter(c => !starlightThemeComponents.includes(c.name))
}

/**
 * Extract prop names from Astro component frontmatter
 * Tries multiple extraction methods:
 * 1. Destructured props: const { prop1, prop2 } = Astro.props
 * 2. JSDoc comments: @prop {type} propName - description
 * @param {string} componentPath - Path to component file
 * @returns {Array<string>} Array of prop names
 */
export function extractPropsFromComponent(componentPath) {
  try {
    const content = readFileSync(componentPath, 'utf-8')
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!frontmatterMatch) return []

    const frontmatter = frontmatterMatch[1]

    // Method 1: Match destructured props - const { prop1, prop2, prop3 = default } = Astro.props
    const propsMatch = frontmatter.match(/const\s*\{\s*([^}]+)\}\s*=\s*Astro\.props/)
    if (propsMatch) {
      return propsMatch[1]
        .split(',')
        .map(prop => prop.trim().split('=')[0].trim())
        .filter(Boolean)
    }

    // Method 2: Parse JSDoc @prop tags - @prop {type} propName - description
    const jsdocProps = []
    const propRegex = /@prop\s+\{[^}]+\}\s+(\[)?(\w+)(\])?/g
    let match
    while ((match = propRegex.exec(frontmatter)) !== null) {
      jsdocProps.push(match[2]) // match[2] is the prop name
    }

    if (jsdocProps.length > 0) return jsdocProps

    return []
  } catch (error) {
    return []
  }
}
