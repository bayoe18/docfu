/**
 * DocFu utilities
 *
 * This module provides utilities for loading DocFu manifest and configuration files.
 */

import {existsSync, readFileSync} from 'fs'
import {join, resolve} from 'path'
import yaml from 'js-yaml'

/**
 * Get root path from environment or default
 * @returns {string} Absolute root path
 */
export function getRoot() {
  const root = process.env.DOCFU_ROOT || '.docfu'
  return resolve(root)
}

/**
 * Load manifest from DOCFU_ROOT/manifest.json
 * @returns {Object} Manifest object or empty object if not found
 */
export function loadManifest() {
  const root = getRoot()
  const manifestPath = join(root, 'manifest.json')

  if (!existsSync(manifestPath)) return {}

  try {
    return JSON.parse(readFileSync(manifestPath, 'utf-8'))
  } catch (error) {
    return {}
  }
}

/**
 * Load config from DOCFU_ROOT/config.yml
 * @returns {Object} Config object or empty object if not found
 */
export function loadConfig() {
  const root = getRoot()
  const configPath = join(root, 'config.yml')

  if (!existsSync(configPath)) return {}

  try {
    return yaml.load(readFileSync(configPath, 'utf-8'))
  } catch (error) {
    return {}
  }
}
