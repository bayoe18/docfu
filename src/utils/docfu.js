/**
 * DocFu utilities
 *
 * This module provides utilities for loading DocFu manifest and configuration files.
 */

import {existsSync, readFileSync} from 'fs'
import {join} from 'path'
import yaml from 'js-yaml'

/**
 * Get workspace path from environment or default
 * @returns {string} Workspace path
 */
export function getWorkspace() {
  return process.env.DOCFU_WORKSPACE || '.docfu/workspace'
}

/**
 * Load manifest.json from workspace
 * @param {string} [workspace] - Optional workspace path (defaults to DOCFU_WORKSPACE)
 * @returns {Object} Manifest object or empty object if not found
 */
export function loadManifest(workspace = getWorkspace()) {
  const manifestPath = join(workspace, 'manifest.json')
  if (!existsSync(manifestPath)) return {}

  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8'))
  } catch (error) {
    return {}
  }
}

/**
 * Load docfu.yml config from workspace
 * @param {string} [workspace] - Optional workspace path (defaults to DOCFU_WORKSPACE)
 * @returns {Object} Config object or empty object if not found
 */
export function loadConfig(workspace = getWorkspace()) {
  const configPath = join(workspace, 'docfu.yml')
  if (!existsSync(configPath)) return {}

  try {
    return yaml.load(readFileSync(configPath, 'utf-8'))
  } catch (error) {
    return {}
  }
}
