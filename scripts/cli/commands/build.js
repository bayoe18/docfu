import {fileURLToPath} from 'url'
import {dirname, join, resolve} from 'path'
import {existsSync} from 'fs'
import {mkdir, copyFile, cp, symlink} from 'fs/promises'
import {getResolvedPaths, setEnvVars, runCommand} from '../utils.js'
import {processDocuments} from '../../lib/prepare.js'
import theme from '../theme.js'

/**
 * Setup workspace as full Astro/Starlight project
 * Copies DocFu project files to workspace root
 * @param {string} workspace - Path to workspace directory
 * @returns {Promise<void>}
 */
async function setupWorkspaceProject(workspace) {
  // Resolve package files relative to DocFu installation
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const packageRoot = resolve(__dirname, '../../..')

  // Copy base src/ structure from DocFu
  const src = join(packageRoot, 'src')
  const workspaceSrc = join(workspace, 'src')
  if (existsSync(src)) {
    await cp(src, workspaceSrc, {recursive: true, force: true})
  }

  // Copy config files
  const configs = ['astro.config.mjs', 'markdoc.config.mjs', 'tsconfig.json', 'package.json']
  for (const name of configs) {
    const source = join(packageRoot, name)
    const dest = join(workspace, name)
    if (existsSync(source)) {
      await copyFile(source, dest)
    }
  }

  // Copy public/ fallback
  const publicSource = join(packageRoot, 'public')
  const publicDest = join(workspace, 'public')
  if (existsSync(publicSource) && !existsSync(publicDest)) {
    await cp(publicSource, publicDest, {recursive: true, force: true})
  }
}

/**
 * Build documentation site (prepare + build static site)
 * Processes markdown to workspace, then builds with Astro to dist directory
 * @param {string} source - Source documentation directory path
 * @param {Object} options - CLI options with workspace, dist paths, and dryRun flag
 * @param {Object} packageJson - Package.json object containing version info
 * @returns {Promise<void>}
 * @example
 * await buildCommand('./docs', {workspace: '.docfu/workspace', dist: '.docfu/dist'}, packageJson)
 * await buildCommand('./docs', {dryRun: true}, packageJson) // Validate config only
 */
export default async function buildCommand(source, options, packageJson) {
  const paths = getResolvedPaths(source, options)

  console.log(theme.primary(`DocFu v${packageJson.version}`))
  console.log(`${theme.muted('Source:')} ${theme.secondary(paths.source)}`)
  console.log(`${theme.muted('Workspace:')} ${theme.secondary(paths.workspace)}`)
  console.log(`${theme.muted('Build output:')} ${theme.secondary(paths.dist)}`)
  console.log()

  // Dry run mode - show config and exit
  if (options.dryRun) {
    console.log(theme.success('✓ Configuration validated (dry-run mode)'))
    console.log()
    console.log(theme.muted('Would process:'))
    console.log(`  ${theme.secondary(paths.source)} ${theme.muted('→')} ${theme.secondary(paths.workspace)}`)
    console.log()
    console.log(theme.muted('Would create/clean:'))
    console.log(`  ${theme.secondary(paths.workspace)}`)
    console.log(`  ${theme.secondary(paths.dist)}`)
    return
  }

  try {
    setEnvVars(paths)

    // Process source markdown (this also cleans/recreates entire .docfu directory)
    const success = await processDocuments(paths.source, paths.root, options)
    if (!success) throw new Error('Processing failed')

    // Setup workspace as full Astro/Starlight project
    await setupWorkspaceProject(paths.workspace)

    console.log()
    console.log(theme.success('✓ Documentation processed successfully'))

    // Symlink workspace/node_modules to DocFu's own node_modules
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const docfuRoot = resolve(__dirname, '../../..')
    const docfuNodeModules = join(docfuRoot, 'node_modules')

    const workspaceNodeModules = join(paths.workspace, 'node_modules')
    if (!existsSync(workspaceNodeModules)) {
      await symlink(docfuNodeModules, workspaceNodeModules, 'dir')
    }

    console.log()
    console.log(theme.info('Building site...'))

    // Run astro from symlinked node_modules
    const astroBin = join(workspaceNodeModules, '.bin/astro')
    await runCommand(astroBin, ['build'], {
      cwd: paths.workspace,
    })

    console.log()
    console.log(theme.success('✓ Build complete'))
    console.log(`${theme.muted('Output:')} ${theme.secondary(paths.dist)}`)
  } catch (error) {
    console.error(theme.danger(`✗ Build failed: ${error.message}`))
    process.exit(1)
  }
}
