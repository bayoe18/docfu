/**
 * Minimal test utilities for CLI-driven integration tests
 * Provides CLI invocation, path management, and cleanup
 */

import spawn from 'cross-spawn'
import {rm, mkdir, copyFile, writeFile} from 'fs/promises'
import {join, dirname, basename} from 'path'
import {existsSync} from 'fs'
import {fileURLToPath} from 'url'

/**
 * Generate unique isolated paths for a test
 * @param {string} testName - Name of the test (e.g., 'build-prepare')
 * @param {string} importMetaUrl - import.meta.url from calling test file
 * @returns {{source: string, root: string, workspace: string, dist: string, engine: string}}
 */
export const getTestPaths = (testName, importMetaUrl) => {
  const file = basename(fileURLToPath(importMetaUrl), '.test.js')
  const dir = basename(dirname(fileURLToPath(importMetaUrl)))
  const base = `.docfu/test/${dir}/${file}/${testName}`
  const root = `${base}-root`

  return {
    source: `${base}-source`,
    root,
    workspace: `${root}/workspace`,
    dist: `${root}/dist`,
    engine: `${root}/engine`,
  }
}

/**
 * Clean up test file directory (for beforeAll)
 * @param {string} importMetaUrl - import.meta.url from calling test file
 * @returns {Promise<void>}
 */
export const cleanupTestFile = async importMetaUrl => {
  const file = basename(fileURLToPath(importMetaUrl), '.test.js')
  const dir = basename(dirname(fileURLToPath(importMetaUrl)))
  const fileDir = `.docfu/test/${dir}/${file}`

  if (existsSync(fileDir)) await rm(fileDir, {recursive: true, force: true})
}

/**
 * Run CLI command and capture output
 * @param {string[]} args - CLI arguments (e.g., ['build', './docs', '--dist', './dist'])
 * @param {Object} options - Additional options
 * @param {string} options.cwd - Working directory (default: process.cwd())
 * @param {Object} options.env - Environment variables to merge with process.env
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
export const runCLI = (args, options = {}) =>
  new Promise((resolve, reject) => {
    const env = {...process.env, NODE_ENV: 'test', CI: 'true', ...options.env}

    const proc = spawn('node', ['./bin/docfu', ...args], {
      cwd: options.cwd || process.cwd(),
      env,
    })

    let stdout = ''
    let stderr = ''

    proc.stdout?.on('data', d => (stdout += d.toString()))
    proc.stderr?.on('data', d => (stderr += d.toString()))

    proc.on('close', exitCode => (exitCode !== 0 ? reject(stderr) : resolve({stdout, stderr, exitCode})))

    proc.on('error', err => reject(err))
  })

/**
 * Create test fixtures by copying files from source fixtures
 * @param {Object} paths - Paths object from getTestPaths()
 * @param {string} dir - Source fixture directory (e.g., 'format-detection')
 * @param {string[]} files - Files to copy (relative to dir)
 * @returns {Promise<void>}
 */
export const createFixtures = async (paths, dir, files) => {
  await mkdir(paths.source, {recursive: true})

  for (const file of files) {
    const src = join('test', 'fixtures', dir, file)
    const dest = join(paths.source, file)
    await mkdir(dirname(dest), {recursive: true})
    await copyFile(src, dest)
  }
}

/**
 * Create test fixtures inline (write content directly)
 * @param {Object} paths - Paths object from getTestPaths()
 * @param {Object} fixtures - Map of filepath to content
 * @returns {Promise<void>}
 * @example
 * await createInlineFixtures(paths, {
 *   'index.md': '# Home\n\nWelcome',
 *   'docfu.yml': 'site:\n  name: Test'
 * })
 */
export const createInlineFixtures = async (paths, fixtures) => {
  await mkdir(paths.source, {recursive: true})

  for (const [filepath, content] of Object.entries(fixtures)) {
    const dest = join(paths.source, filepath)
    await mkdir(dirname(dest), {recursive: true})
    await writeFile(dest, content)
  }
}
