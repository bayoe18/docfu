/**
 * @fileoverview DocFu-provided components
 * Central registry for components shipped with DocFu
 */

/**
 * DocFu-provided components (static list)
 * These components are auto-imported in MDX and auto-registered as tags in Markdoc
 *
 * To add a new DocFu component:
 * 1. Create the .astro file in src/components/
 * 2. Add the component name to this array
 * 3. Component props will be auto-discovered via JSDoc or destructuring
 *
 * Note: Fence is included for explicit use in MDX (Mermaid diagrams). In Markdoc,
 * it's also registered as a node override for automatic code block handling.
 */
export const DOCFU_COMPONENTS = ['Fence']
