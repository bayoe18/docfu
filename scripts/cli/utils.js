import spawn from 'cross-spawn'
import {existsSync, readFileSync} from 'fs'
import {homedir} from 'os'
import {dirname, join, resolve} from 'path'
import {fileURLToPath} from 'url'
import {detect} from 'detect-package-manager'
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
 * Resolve node_modules directory that contains a specific binary
 * Handles npm hoisting where dependencies may be in parent node_modules
 * @param {string} binaryName - Name of the binary to locate (e.g., 'astro', 'http-server')
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @returns {string} Path to node_modules directory containing the binary
 * @example
 * const nodeModules = resolveNodeModules('astro', import.meta.url)
 * const astroBin = join(nodeModules, '.bin/astro')
 */
export function resolveNodeModules(binaryName, importMetaUrl) {
  const __dirname = dirname(fileURLToPath(importMetaUrl))
  const packageRoot = resolve(__dirname, '../../..')

  // Check parent node_modules first (npm hoists dependencies when using npx)
  const parentNodeModules = resolve(packageRoot, '..')
  if (existsSync(join(parentNodeModules, '.bin', binaryName))) return parentNodeModules

  return join(packageRoot, 'node_modules')
}

/**
 * Resolve binary path for any package manager (npm, pnpm, Yarn Classic, Yarn PnP, Bun)
 * Detects package manager and uses appropriate resolution strategy
 * @param {string} packageName - Name of the package containing the binary (e.g., 'astro', 'http-server')
 * @param {string} importMetaUrl - import.meta.url from calling module
 * @returns {Promise<string>} Absolute path to the binary executable
 * @throws {Error} If binary cannot be resolved
 * @example
 * const astroBin = await resolveBinary('astro', import.meta.url)
 * await runCommand(astroBin, ['build'], {cwd: workspace})
 */
export async function resolveBinary(packageName, importMetaUrl) {
  // Check for Yarn PnP mode
  if (process.versions.pnp) {
    try {
      // Yarn PnP doesn't create .bin directories - use pnpapi to resolve
      const pnpapi = await import('pnpapi')

      const packageJsonPath = pnpapi.resolveToUnqualified(`${packageName}/package.json`, process.cwd())
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

      // Get binary path from package.json bin field
      let binaryPath
      if (typeof packageJson.bin === 'string') {
        binaryPath = packageJson.bin
      } else if (typeof packageJson.bin === 'object') {
        // bin field can be an object with multiple binaries
        binaryPath = packageJson.bin[packageName] || Object.values(packageJson.bin)[0]
      }

      if (!binaryPath) {
        throw new Error(`Package ${packageName} does not expose a binary`)
      }

      const packageDir = dirname(packageJsonPath)
      const resolvedPath = resolve(packageDir, binaryPath)

      if (!existsSync(resolvedPath)) {
        throw new Error(`Binary not found at ${resolvedPath}`)
      }

      return resolvedPath
    } catch (error) {
      throw new Error(
        `Failed to resolve binary '${packageName}' in Yarn PnP mode: ${error.message}\n` +
          `Hint: Ensure ${packageName} is listed in your dependencies.`
      )
    }
  }

  // For npm, pnpm, Yarn Classic, and Bun - use traditional .bin resolution
  const nodeModules = resolveNodeModules(packageName, importMetaUrl)
  const binaryPath = join(nodeModules, '.bin', packageName)

  if (!existsSync(binaryPath)) {
    const pm = await detect().catch(() => 'npm')
    throw new Error(
      `Binary '${packageName}' not found at ${binaryPath}\n` +
        `Package manager: ${pm}\n` +
        `Hint: Ensure ${packageName} is listed in your dependencies and run '${pm} install'.`
    )
  }

  return binaryPath
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
 * @param {Object} options - CLI options object with root property
 * @returns {{source: string, root: string, workspace: string, dist: string}} Resolved absolute paths
 * @example
 * const paths = getResolvedPaths('./docs', {root: '.docfu'})
 * // {source: '/abs/path/docs', root: '/abs/path/.docfu', workspace: '/abs/path/.docfu/workspace', dist: '/abs/path/.docfu/dist'}
 */
export function getResolvedPaths(source, options) {
  const config = loadConfig()

  const sourceDir = expandTilde(source || process.env.DOCFU_SOURCE)
  const rootDir = expandTilde(options.root || config?.root || process.env.DOCFU_ROOT || '.docfu')

  if (!sourceDir) {
    console.error(theme.danger('✗ Error: No source documentation directory specified'))
    console.error(theme.muted('  Provide the path to your markdown documentation'))
    console.error(theme.muted('  Example: docfu prepare ./my-docs'))
    process.exit(1)
  }

  const resolvedRoot = resolve(rootDir)

  return {
    source: resolve(sourceDir),
    root: resolvedRoot,
    workspace: join(resolvedRoot, 'workspace'),
    dist: join(resolvedRoot, 'dist'),
  }
}

/**
 * Set environment variables for child processes
 * @param {{source: string, root: string, workspace: string, dist: string}} paths - Resolved absolute paths
 * @example
 * setEnvVars({source: '/abs/docs', root: '/abs/.docfu', workspace: '/abs/.docfu/workspace', dist: '/abs/.docfu/dist'})
 * // Sets DOCFU_SOURCE and DOCFU_ROOT env vars
 */
export function setEnvVars(paths) {
  process.env.DOCFU_SOURCE = paths.source
  process.env.DOCFU_ROOT = paths.root
}
