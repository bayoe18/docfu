import spawn from 'cross-spawn'
import {existsSync, readFileSync} from 'fs'
import {homedir} from 'os'
import {dirname, join, resolve} from 'path'
import yaml from 'js-yaml'
import theme from './theme.js'

/**
 * Expand tilde (~) to home directory
 * @param {string} filepath - Path that may contain tilde
 * @returns {string} Resolved absolute path with tilde expanded
 * @example
 * expandTilde('~/docs') // '/Users/username/docs'
 * expandTilde('./docs') // './docs' (unchanged)
 */
export function expandTilde(filepath) {
  if (!filepath) return filepath
  if (filepath === '~') return homedir()
  if (filepath.startsWith('~/')) return join(homedir(), filepath.slice(2))
  return filepath
}

/**
 * Load docfu.yml from current working directory if it exists
 * @returns {Object|null} Parsed configuration object or null if not found/invalid
 * @example
 * const config = loadConfig()
 * if (config) {
 *   console.log(config.workspace) // '.docfu/workspace'
 * }
 */
export function loadConfig() {
  const configPath = join(process.cwd(), 'docfu.yml')
  if (!existsSync(configPath)) return null

  try {
    const content = readFileSync(configPath, 'utf-8')
    return yaml.load(content)
  } catch (error) {
    console.error(theme.warning(`⚠ Warning: Could not parse docfu.yml: ${error.message}`))
    return null
  }
}

/**
 * Run a command and return a promise
 * @param {string} cmd - Command to execute
 * @param {string[]} args - Command arguments
 * @param {Object} options - Spawn options (stdio, shell, cwd, env, etc.)
 * @returns {Promise<void>} Resolves on success, rejects on error or non-zero exit
 * @example
 * await runCommand('node', ['script.js'])
 * await runCommand('npm', ['run', 'build'], {cwd: '/path/to/project'})
 * await runCommand('npm', ['run', 'build'], {env: {...process.env, FOO: 'bar'}})
 */
export function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: 'inherit',
      env: process.env,
      ...options,
    })

    proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`Command failed with exit code ${code}`))))

    proc.on('error', err => reject(err))
  })
}

/**
 * Get resolved paths from options and source
 * Priority: CLI flags > docfu.yml > environment variables > defaults
 * @param {string} source - Source documentation directory path
 * @param {Object} options - CLI options object with workspace and dist properties
 * @returns {{source: string, workspace: string, dist: string, engine?: string}} Resolved absolute paths
 * @example
 * const paths = getResolvedPaths('./docs', {workspace: '.docfu/workspace'})
 * // {source: '/abs/path/docs', workspace: '/abs/path/.docfu/workspace', dist: '/abs/path/.docfu/dist'}
 */
export function getResolvedPaths(source, options) {
  const config = loadConfig()

  const sourceDir = expandTilde(source || process.env.DOCFU_SOURCE)
  const workspaceDir = expandTilde(
    options.workspace || config?.workspace || process.env.DOCFU_WORKSPACE || '.docfu/workspace'
  )
  const distDir = expandTilde(options.dist || config?.dist || process.env.DOCFU_DIST || '.docfu/dist')

  // Derive engine from workspace: sibling directory named 'engine'
  // workspace: .docfu/workspace → engine: .docfu/engine
  // workspace: .docfu/test/foo/workspace → engine: .docfu/test/foo/engine
  const workspaceResolved = resolve(workspaceDir)
  const engineDir = join(dirname(workspaceResolved), 'engine')

  if (!sourceDir) {
    console.error(theme.danger('✗ Error: No source documentation directory specified'))
    console.error(theme.muted('  Provide the path to your markdown documentation'))
    console.error(theme.muted('  Example: docfu prepare ./my-docs'))
    process.exit(1)
  }

  return {
    source: resolve(sourceDir),
    workspace: resolve(workspaceDir),
    dist: resolve(distDir),
    engine: resolve(engineDir),
  }
}

/**
 * Set environment variables for child processes
 * @param {{source: string, workspace: string, dist: string, engine: string}} paths - Resolved absolute paths
 * @example
 * setEnvVars({source: '/abs/docs', workspace: '/abs/.docfu/workspace', dist: '/abs/.docfu/dist', engine: '/abs/.docfu/engine'})
 * // Sets DOCFU_SOURCE, DOCFU_WORKSPACE, DOCFU_DIST, DOCFU_ENGINE env vars
 */
export function setEnvVars(paths) {
  process.env.DOCFU_SOURCE = paths.source
  process.env.DOCFU_WORKSPACE = paths.workspace
  process.env.DOCFU_DIST = paths.dist
  process.env.DOCFU_ENGINE = paths.engine
}
