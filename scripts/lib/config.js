/**
 * @fileoverview Configuration discovery, merging, and cascade resolution
 * Finds all docfu.yml files in source tree and merges into master config
 */

import {readFile} from 'fs/promises'
import {join, dirname} from 'path'
import {glob} from 'glob'
import yaml from 'js-yaml'

/**
 * Discover all docfu.yml files in source directory and merge into master config
 * @param {string} source - Root source directory
 * @returns {Promise<{master: Object, hierarchical: Array}>} Master config and hierarchical configs
 */
export async function discover(source) {
  const configFiles = await glob('**/docfu.yml', {
    cwd: source,
    dot: false,
    ignore: ['node_modules/**', '.git/**'],
  })

  const configs = []
  for (const path of configFiles) {
    const fullPath = join(source, path)
    const content = await readFile(fullPath, 'utf-8')
    const config = yaml.load(content) || {}
    const dir = dirname(path)
    configs.push({dir, config, fullPath})
  }

  configs.sort((a, b) => {
    const depthA = a.dir === '.' ? 0 : a.dir.split('/').length
    const depthB = b.dir === '.' ? 0 : b.dir.split('/').length
    return depthA - depthB
  })

  const master = {
    site: {
      name: null,
      url: null,
    },
    sidebar: null,
    assets: null,
    components: null,
    exclude: [],
    unlisted: [],
  }

  const root = configs.find(c => c.dir === '.')
  if (root) {
    master.site.name = root.config.site?.name || master.site.name
    master.site.url = root.config.site?.url || master.site.url
    master.sidebar = root.config.sidebar || master.sidebar
    master.assets = root.config.assets || master.assets
    master.components = root.config.components !== undefined ? root.config.components : master.components
  }

  for (const {dir, config} of configs) {
    if (config.exclude?.length) {
      const prefixed = config.exclude.map(pattern => (dir === '.' ? pattern : join(dir, pattern).replace(/\\/g, '/')))
      master.exclude.push(...prefixed)
    }

    if (config.unlisted?.length) {
      const prefixed = config.unlisted.map(pattern => (dir === '.' ? pattern : join(dir, pattern).replace(/\\/g, '/')))
      master.unlisted.push(...prefixed)
    }
  }

  return {master, hierarchical: configs}
}

/**
 * Get applicable frontmatter configuration for a specific file
 * Merges directory-level defaults and file-specific overrides
 * @param {Array} configs - Array of {dir, config} objects from discover
 * @param {string} source - Root source directory
 * @param {string} file - Absolute file path
 * @returns {Object} Merged frontmatter config with {defaults, fileSpecific}
 */
export function getApplicable(configs, source, file) {
  const relative = join(file).replace(join(source), '').replace(/^\//, '')
  const fileDir = dirname(relative)
  const fileName = relative.split('/').pop()

  let defaults = {}
  let fileSpecific = null

  for (const {dir, config} of configs) {
    const isAncestor = dir === '.' || fileDir === dir || fileDir.startsWith(dir + '/')

    if (isAncestor) {
      if (config.frontmatter) {
        defaults = deepMerge(defaults, config.frontmatter)
      }

      const configDir = dir === '.' ? '' : dir + '/'
      const relativeToConfig = relative.replace(configDir, '')

      if (config[fileName]?.frontmatter) {
        fileSpecific = config[fileName].frontmatter
      } else if (config[relativeToConfig]?.frontmatter) {
        fileSpecific = config[relativeToConfig].frontmatter
      }
    }
  }

  return {defaults, fileSpecific}
}

/**
 * Deep merge two objects (for YAML frontmatter merging)
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge
 * @returns {Object} Merged object
 */
function deepMerge(target, source) {
  const result = {...target}

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key])
    } else {
      result[key] = source[key]
    }
  }

  return result
}
