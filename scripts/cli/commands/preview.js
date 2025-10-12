import {join} from 'path'
import spawn from 'cross-spawn'
import chokidar from 'chokidar'
import {getResolvedPaths, resolveNodeModules} from '../utils.js'
import buildCommand from './build.js'
import theme from '../theme.js'

/**
 * Preview documentation site locally (build + serve)
 * Builds the site using buildCommand, then serves on local HTTP server
 * Optionally watches for changes and rebuilds
 * @param {string} source - Source documentation directory path
 * @param {Object} options - CLI options with workspace, dist paths, port number, and watch flag
 * @param {Object} packageJson - Package.json object containing version info
 * @returns {Promise<void>}
 * @example
 * await previewCommand('./docs', {port: '4321'}, packageJson)
 * await previewCommand('./docs', {port: '3000', watch: true}, packageJson)
 */
export default async function previewCommand(source, options, packageJson) {
  const paths = getResolvedPaths(source, options)

  try {
    await buildCommand(source, options, packageJson)
    console.log()

    console.log(theme.primary(`Starting server on port ${options.port}...`))
    console.log()
    console.log(`   ${theme.success('➜')} ${theme.muted('Local:')} ${theme.link(`http://localhost:${options.port}`)}`)
    console.log()

    if (options.watch) {
      console.log(theme.info(`   ${theme.muted('Watching')} ${paths.source} ${theme.muted('for changes...')}`))
      console.log()
    }

    console.log(theme.muted('   Press Ctrl+C to stop'))
    console.log()

    // Resolve node_modules location
    const nodeModules = resolveNodeModules('http-server', import.meta.url)
    const httpServerBin = join(nodeModules, '.bin/http-server')

    // Spawn http-server as child process (non-blocking if watching)
    const server = spawn(httpServerBin, [paths.dist, '-p', options.port, '-c-1', '-o'], {
      stdio: options.watch ? 'ignore' : 'inherit',
    })

    if (options.watch) {
      let isRebuilding = false

      const watcher = chokidar.watch(paths.source, {
        ignored: /(^|[\/\\])\..*/,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 1000,
          pollInterval: 100,
        },
      })

      // Debounce processing to avoid multiple rapid rebuilds
      let timeout
      const debouncedRebuild = () => {
        clearTimeout(timeout)
        timeout = setTimeout(async () => {
          if (isRebuilding) return

          isRebuilding = true
          console.log(theme.info('● Changes detected, rebuilding...'))

          try {
            await buildCommand(source, options, packageJson)
            console.log(theme.success('✓ Rebuild complete'))
            console.log(theme.muted('  Refresh browser to see changes'))
            console.log()
          } catch (error) {
            console.error(theme.danger(`✗ Rebuild failed: ${error.message}`))
          } finally {
            isRebuilding = false
          }
        }, 500)
      }

      watcher.on('add', debouncedRebuild).on('change', debouncedRebuild).on('unlink', debouncedRebuild)

      const shutdown = () => {
        console.log()
        console.log(theme.muted('■ Stopping server and watcher...'))
        watcher.close()
        server.kill()
        process.exit(0)
      }

      process.on('SIGINT', shutdown)
      process.on('SIGTERM', shutdown)

      await new Promise(() => {})
    } else {
      await new Promise((resolve, reject) => {
        server.on('close', code => (code === 0 ? resolve() : reject(new Error(`Server exited with code ${code}`))))
        server.on('error', reject)
      })
    }
  } catch (error) {
    console.error(theme.danger(`✗ Preview failed: ${error.message}`))
    process.exit(1)
  }
}
