import {getResolvedPaths, setEnvVars, runCommand} from '../utils.js'
import {processDocuments} from '../../lib/prepare.js'
import theme from '../theme.js'

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

    const success = await processDocuments(paths.source, paths.workspace, paths.dist, paths.engine)
    if (!success) throw new Error('Processing failed')

    console.log()
    console.log(theme.success('✓ Documentation processed successfully'))

    console.log()
    console.log(theme.info('Building site...'))

    await runCommand('npx', ['astro', 'build'])
    console.log()
    console.log(theme.success('✓ Build complete'))
    console.log(`${theme.muted('Output:')} ${theme.secondary(paths.dist)}`)
  } catch (error) {
    console.error(theme.danger(`✗ Build failed: ${error.message}`))
    process.exit(1)
  }
}
