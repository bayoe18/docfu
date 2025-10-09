import {getResolvedPaths, setEnvVars} from '../utils.js'
import {processDocuments} from '../../lib/prepare.js'
import theme from '../theme.js'

/**
 * Prepare documentation for build (process markdown only, no build)
 * Processes source markdown files and copies them to workspace directory
 * @param {string} source - Source documentation directory path
 * @param {Object} options - CLI options with workspace and dist paths
 * @param {Object} packageJson - Package.json object containing version info
 * @returns {Promise<void>}
 * @example
 * await prepareCommand('./docs', {workspace: '.docfu/workspace'}, packageJson)
 */
export default async function prepareCommand(source, options, packageJson) {
  const paths = getResolvedPaths(source, options)

  console.log(theme.primary(`DocFu v${packageJson.version}`))
  console.log(`${theme.muted('Source:')} ${theme.secondary(paths.source)}`)
  console.log(`${theme.muted('Workspace:')} ${theme.secondary(paths.workspace)}`)
  console.log()

  try {
    setEnvVars(paths)
    const success = await processDocuments(paths.source, paths.workspace, paths.dist, paths.engine)

    if (!success) throw new Error('Processing failed')

    console.log()
    console.log(theme.success('✓ Documentation prepared successfully'))
    console.log(`${theme.muted('Workspace:')} ${theme.secondary(paths.workspace)}`)
  } catch (error) {
    console.error(theme.danger(`✗ Prepare failed: ${error.message}`))
    process.exit(1)
  }
}
