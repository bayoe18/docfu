/**
 * @fileoverview Main processing engine for DocFu
 * Handles transforming, converting, and preparing markdown files from external sources
 */

import {mkdir, copyFile, readdir, readFile, writeFile, cp, symlink} from 'fs/promises'
import {createInterface} from 'readline'
import {homedir} from 'os'
import {fileURLToPath} from 'url'
import {resolve, join, relative, dirname} from 'path'
import {existsSync} from 'fs'
import {deleteAsync} from 'del'
import {minimatch} from 'minimatch'
import * as yaml from 'js-yaml'
import {getTitle, parseFrontmatter, ensureTitle, mergeFrontmatterWithHierarchicalConfig} from './frontmatter.js'
import {process as mdx} from './md2mdx.js'
import {process as mdoc} from './md2mdoc.js'
import {getTargetFormat, getTargetExtension} from './syntax.js'
import {ALL_MARKDOWN_EXTENSIONS} from './patterns.js'
import {discover, getApplicable} from './config.js'
import {transformReadmeLinks} from './ast.js'

const DEFAULT_WORKSPACE = '.docfu/workspace'
const DEFAULT_DIST = '.docfu/dist'

/**
 * Expand tilde (~) in file paths to home directory
 * @param {string} path - Path that may contain tilde
 * @returns {string} Expanded path
 */
const expandPath = path => (path.startsWith('~') ? join(homedir(), path.slice(1)) : path)

/**
 * Discover components in a directory
 * @param {string} path - Absolute path to components directory
 * @param {string} workspace - Workspace root path for relative path calculation
 * @returns {Promise<Array>} Array of component metadata objects
 */
const discoverComponents = async (path, workspace) => {
  if (!existsSync(path)) return []

  const components = []
  const files = await readdir(path, {withFileTypes: true, recursive: true})

  for (const f of files) {
    if (!f.isFile()) continue

    const fullPath = resolve(join(f.parentPath ?? f.path, f.name))
    const relativePath = relative(workspace, fullPath)

    const name = f.name.replace(/\.[^.]+$/, '')

    const finalFilename = `${name}.astro`
    const finalPath = relativePath.replace(/\.[^.]+$/, '.astro').replace(/\\/g, '/')

    components.push({
      name,
      filename: finalFilename,
      path: finalPath,
      type: 'astro',
    })
  }

  return components
}

/**
 * Discover CSS files in assets directory
 * @param {string} path - Absolute path to assets directory
 * @param {string} workspace - Workspace root path for relative path calculation
 * @returns {Promise<Array>} Array of CSS file metadata objects (sorted alphabetically)
 */
const discoverCss = async (path, workspace) => {
  if (!existsSync(path)) return []

  const css = []
  const files = await readdir(path, {withFileTypes: true, recursive: true})

  for (const f of files) {
    if (!f.isFile() || !f.name.endsWith('.css')) continue

    const fullPath = resolve(join(f.parentPath ?? f.path, f.name))
    const relativePath = relative(workspace, fullPath).replace(/\\/g, '/')

    css.push({path: relativePath})
  }

  return css.sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * Prompt user for confirmation before destructive operation
 * @param {string} message - Confirmation message to display
 * @returns {Promise<boolean>} True if user confirmed, false otherwise
 */
const confirm = message => {
  if (process.env.CI) return Promise.resolve(true)

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve =>
    rl.question(`${message} (y/N): `, answer => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  )
}

/**
 * Check if a path is dangerous to delete (common system directories)
 * This provides an additional safety layer beyond del's built-in protections
 * @param {string} path - Absolute path to check
 * @returns {boolean} True if path is a critical system directory
 */
const isDangerousSystemPath = path => {
  const home = homedir()
  const normalizedPath = resolve(path)
  const dangerous = ['/', home, join(home, 'Documents'), join(home, 'Desktop'), join(home, 'Downloads')]
  return dangerous.some(dir => normalizedPath === dir)
}

/**
 * Transform markdown syntax based on detected format
 * @param {string} source - Original source file path (for title extraction)
 * @param {string} destination - Target file path
 * @param {string} content - Markdown content to transform
 * @param {Object} options - Processing options
 * @returns {Promise<{content: string, format: string}>} Transformed content and detected format
 */
const transformMarkdownSyntax = async (source, destination, content, options = {}) => {
  let transformed = await transformReadmeLinks(content)

  const {format, shouldConvert} = getTargetFormat(destination, transformed, options)

  if (shouldConvert) {
    switch (format) {
      case 'mdx':
        transformed = mdx(destination, transformed, {
          customComponents: options.customComponents || [],
        })
        break
      case 'markdoc':
        transformed = await mdoc(destination, transformed)
        break
    }
  } else if (destination.endsWith('.mdoc')) {
    transformed = await mdoc(destination, transformed)
  } else if (destination.endsWith('.mdx')) {
    // MDX files need auto-import even when not converting format
    transformed = mdx(destination, transformed, {
      customComponents: options.customComponents || [],
    })
  }

  const withTitle = await mergeFrontmatterWithHierarchicalConfig(source, transformed, options)

  return {content: withTitle, format}
}

/**
 * Get documentation source path from command line arguments or environment
 * @returns {string|undefined} Resolved source path or undefined if not found
 */
export function getSource() {
  const pathArg = process.argv.find(arg => !arg.startsWith('--') && arg !== process.argv[0] && arg !== process.argv[1])
  const source = pathArg || process.env.DOCFU_SOURCE
  return source ? resolve(expandPath(source)) : undefined
}

/**
 * Update partial references to match renamed file extensions
 * @param {string} destination - Destination directory to scan
 * @param {Map<string, string>} fileConversionMap - Map of original paths to final paths
 */
async function updatePartialReferences(destination, fileConversionMap) {
  const partialReferencePattern = /{%\s*partial\s+file=["']([^"']+)["']/g

  const entries = await readdir(destination, {withFileTypes: true, recursive: true})
  const mdocs = entries.filter(f => f.isFile() && f.name.endsWith('.mdoc'))

  let updatedCount = 0

  for (const f of mdocs) {
    const filePath = resolve(join(f.parentPath ?? f.path, f.name))
    const content = await readFile(filePath, 'utf-8')
    let hasChanges = false

    const updatedContent = content.replace(partialReferencePattern, (match, partialPath) => {
      const normalizedPath = partialPath.replace(/^\.\//, '')

      if (fileConversionMap.has(normalizedPath)) {
        const newPath = fileConversionMap.get(normalizedPath)
        hasChanges = true
        console.log(`→ Updated partial reference: ${partialPath} → ${newPath} in ${filePath}`)
        return match.replace(partialPath, newPath)
      }

      return match
    })

    if (hasChanges) {
      await writeFile(filePath, updatedContent)
      updatedCount++
    }
  }

  if (updatedCount > 0) {
    console.log(`✓ Updated partial references in ${updatedCount} file(s)`)
  }
}

/**
 * Setup isolated Astro engine directory for builds
 * Copies src/, config files, and public/ to isolated engine
 * @param {string} engine - Path to Astro engine directory
 * @param {string} workspace - Path to workspace directory
 * @param {Object} config - Master configuration object
 * @returns {Promise<void>}
 */
async function setupAstroEngine(engine, workspace, config) {
  // SAFETY: followSymbolicLinks: false ensures symlinks are removed without following them.
  // This is POSIX-compliant behavior - when fs.promises.rm() encounters a symlink, it
  // unlinks the symlink without following it.
  // Reference: Node.js PR #45439 (2023) - fixed to use lstat instead of stat for symlinks.
  // The node_modules symlink created below will be safely removed without deleting the
  // actual DocFu dependencies it points to.
  if (existsSync(engine)) {
    await deleteAsync(engine, {
      cwd: process.cwd(),
      force: false,
      followSymbolicLinks: false,
    })
  }
  await mkdir(engine, {recursive: true})

  const src = resolve('src')
  const engineSrc = join(engine, 'src')
  if (existsSync(src)) {
    await cp(src, engineSrc, {recursive: true, force: true})
  }

  const scripts = resolve('scripts')
  const engineScripts = join(engine, 'scripts')
  if (existsSync(scripts)) {
    await cp(scripts, engineScripts, {recursive: true, force: true})
  }

  const configs = ['astro.config.mjs', 'markdoc.config.mjs', 'tsconfig.json']
  for (const name of configs) {
    const source = resolve(name)
    const dest = join(engine, name)
    if (existsSync(source)) {
      await copyFile(source, dest)
    }
  }

  const assetsDir = config.assets || 'assets'
  const assets = join(workspace, assetsDir)
  const publicDir = join(engine, 'public')
  const publicAssets = join(publicDir, assetsDir)

  if (existsSync(assets)) {
    await cp(assets, publicAssets, {recursive: true, force: true})
  } else {
    const fallback = resolve('public')
    if (existsSync(fallback)) {
      await cp(fallback, publicDir, {recursive: true, force: true})
    }
  }

  const source = resolve('node_modules')
  const dest = join(engine, 'node_modules')

  if (existsSync(source)) {
    try {
      const type = process.platform === 'win32' ? 'junction' : 'dir'
      await symlink(source, dest, type)
    } catch (error) {
      if (error.code === 'EROFS') {
        console.warn('⚠ Warning: Cannot create symlink on read-only filesystem')
        console.warn('  Try running from a writable directory or contact your system administrator.')
      } else if (error.code === 'EPERM') {
        if (process.platform === 'win32') {
          console.warn('⚠ Warning: Permission denied creating symlink')
          console.warn('  On Windows, try enabling Developer Mode or running as Administrator.')
        } else {
          console.warn('⚠ Warning: Permission denied creating symlink')
          console.warn('  Check directory permissions or try a different location.')
        }
      } else if (error.code === 'EXDEV') {
        console.warn('⚠ Warning: Cannot create symlink across filesystems')
        console.warn('  Workspace and DocFu installation are on different devices/mounts.')
      } else {
        console.warn(`⚠ Warning: Could not create node_modules link: ${error.message}`)
      }
      console.warn('  Build may fail if dependencies cannot be resolved.')
      // Don't throw - let Astro fail with its own error if needed
    }
  }
}

/**
 * Main processing function that transforms and prepares documentation files
 * @param {string} [source] - Source directory path (defaults to getSource())
 * @param {string} [workspace] - Workspace directory path (defaults to env var or DEFAULT_WORKSPACE)
 * @param {string} [dist] - Dist directory path (defaults to env var or DEFAULT_DIST)
 * @param {string} astroEngine - Astro engine directory path for isolated builds
 * @returns {Promise<boolean>} True if processing completed successfully, false otherwise
 */
export async function processDocuments(source, workspace, dist, astroEngine) {
  source = source || getSource()

  // Determine workspace directory (destination for processed files)
  // Priority: 1. Function parameter, 2. DOCFU_WORKSPACE env var, 3. Default
  // Using glob loader in content.config.ts, workspace root acts as the docs collection directly
  const workspaceRoot = resolve(workspace || process.env.DOCFU_WORKSPACE || DEFAULT_WORKSPACE)
  const destination = workspaceRoot

  // Determine dist directory (for safety checks only - not cleaned by this script)
  // Priority: 1. Function parameter, 2. DOCFU_DIST env var, 3. Default
  dist = resolve(dist || process.env.DOCFU_DIST || DEFAULT_DIST)

  console.log(`Processing docs:`)
  console.log(`  Source: ${source}`)
  console.log(`  Workspace: ${workspaceRoot}`)
  console.log(`  Build output: ${dist}`)

  if (!existsSync(source)) {
    console.error(`✗ Source directory not found: ${source}`)
    return false
  }

  // Additional safety layer beyond del's built-in protections
  if (isDangerousSystemPath(destination)) {
    console.error(`✗ DANGER: Workspace path is a critical system directory: ${destination}`)
    console.error(`  Refusing to delete: home, root, Documents, Desktop, or Downloads.`)
    console.error(`  Please use a safe subdirectory for DOCFU_WORKSPACE.`)
    process.exit(1)
  }

  if (isDangerousSystemPath(dist)) {
    console.error(`✗ DANGER: Dist path is a critical system directory: ${dist}`)
    console.error(`  Refusing to delete: home, root, Documents, Desktop, or Downloads.`)
    console.error(`  Please use a safe subdirectory for DOCFU_DIST.`)
    process.exit(1)
  }

  const isSafeDocfuPath = path => {
    const normalized = resolve(path)
    const relativeToCwd = relative(process.cwd(), normalized)
    return relativeToCwd.startsWith('.docfu/')
  }

  /**
   * Safely delete a directory using del package
   * @param {string} dirPath - Directory path to delete
   * @param {string} displayName - Human-readable name for logging
   */
  const safeDelete = async (dirPath, displayName) => {
    if (!existsSync(dirPath)) return

    if (!isSafeDocfuPath(dirPath)) {
      const confirmed = await confirm(`⚠️  About to delete and recreate: ${dirPath}\n   Continue?`)
      if (!confirmed) {
        console.log('✗ Build cancelled by user')
        process.exit(1)
      }
    }

    console.log(`→ Cleaning ${displayName}: ${dirPath}`)

    try {
      await deleteAsync(dirPath, {
        cwd: process.cwd(),
        force: false,
        followSymbolicLinks: false,
      })
    } catch (error) {
      console.error(`✗ DANGER: Cannot delete ${displayName}: ${dirPath}`)
      console.error(`  ${error.message}`)
      console.error(`  This path is protected by safety checks.`)
      process.exit(1)
    }
  }

  await safeDelete(destination, 'workspace')

  await mkdir(destination, {recursive: true})

  console.log(`→ Discovering docfu.yml configuration files...`)
  const {master: masterConfig, hierarchical: hierarchicalConfigs} = await discover(source)

  const assetsDir = masterConfig.assets || 'assets'
  const assets = join(source, assetsDir)
  const workspaceAssets = join(workspaceRoot, assetsDir)

  if (existsSync(assets)) {
    console.log(`→ Copying assets from ${assetsDir}/...`)
    await cp(assets, workspaceAssets, {recursive: true})
  }

  await setupAstroEngine(astroEngine, workspaceRoot, masterConfig)

  const masterConfigPath = join(destination, 'docfu.yml')
  await writeFile(masterConfigPath, yaml.dump(masterConfig))
  console.log(`→ Master config saved: ${masterConfigPath}`)

  if (masterConfig.exclude?.length > 0) {
    console.log(`→ Exclude patterns: ${masterConfig.exclude.join(', ')}`)
  }
  if (masterConfig.unlisted?.length > 0) {
    console.log(`→ Unlisted patterns: ${masterConfig.unlisted.join(', ')}`)
  }

  const fileConversionMap = new Map()

  const docs = []

  const files = await readdir(source, {withFileTypes: true, recursive: true})

  /**
   * Check if a file matches any exclude patterns using glob matching
   * @param {string} filePath - File path to check
   * @returns {boolean} True if file matches an exclude pattern
   */
  const isExcludedFile = filePath => {
    if (!masterConfig.exclude?.length) return false

    const relativePath = relative(source, filePath)
    const normalizedPath = relativePath.replace(/\\/g, '/')

    return masterConfig.exclude.some(pattern => {
      let normalizedPattern = pattern
      if (pattern.endsWith('/')) normalizedPattern = pattern + '**'

      if (!normalizedPattern.includes('/')) {
        if (minimatch(normalizedPath, `${normalizedPattern}/**`)) return true
        if (minimatch(normalizedPath, normalizedPattern, {matchBase: true})) return true
        return false
      }

      return minimatch(normalizedPath, normalizedPattern)
    })
  }

  /**
   * Check if a file matches any unlisted patterns using glob matching
   * Unlisted files are processed and built, but excluded from search (pagefind: false)
   * @param {string} filePath - File path to check
   * @returns {boolean} True if file matches an unlisted pattern
   */
  const isUnlistedFile = filePath => {
    if (!masterConfig.unlisted?.length) return false

    const relativePath = relative(source, filePath)
    const normalizedPath = relativePath.replace(/\\/g, '/')

    return masterConfig.unlisted.some(pattern => {
      let normalizedPattern = pattern
      if (pattern.endsWith('/')) normalizedPattern = pattern + '**'

      if (!normalizedPattern.includes('/')) {
        if (minimatch(normalizedPath, `${normalizedPattern}/**`)) return true
        if (minimatch(normalizedPath, normalizedPattern, {matchBase: true})) return true
        return false
      }

      return minimatch(normalizedPath, normalizedPattern)
    })
  }

  const componentsDir =
    masterConfig.components !== undefined && masterConfig.components !== null ? masterConfig.components : 'components'
  const componentsEnabled = componentsDir !== false && componentsDir !== null

  // Discover components early from SOURCE (before copying) so we can pass them to MDX processor
  // They will be copied to workspace during file processing loop below
  let discoveredComponents = []
  if (componentsEnabled) {
    const sourceComponentsPath = join(source, componentsDir)
    // Discover from source, but use workspace paths for manifest (components will be copied there)
    const components = await discoverComponents(sourceComponentsPath, source)
    // Adjust paths to point to workspace locations
    discoveredComponents = components.map(comp => ({
      ...comp,
      path: join(componentsDir, comp.filename).replace(/\\/g, '/'),
    }))
    if (discoveredComponents.length > 0) {
      console.log(`→ Discovered ${discoveredComponents.length} component(s) in ${componentsDir}/`)
    }
  }

  // Discover CSS files in assets directory for auto-loading
  const discoveredCss = await discoverCss(assets, source)
  if (discoveredCss.length > 0) {
    console.log(`→ Discovered ${discoveredCss.length} CSS file(s) in ${assetsDir}/`)
  }

  // Copy all files (filtering happens via exclude patterns)
  for (const f of files) {
    if (!f.isFile()) continue

    const originFile = resolve(join(f.parentPath ?? f.path, f.name))

    if (f.name === 'docfu.yml') continue

    const assetsDir = masterConfig.assets || 'assets'
    const relativePath = relative(source, originFile)
    if (relativePath.startsWith(assetsDir + '/') || relativePath.startsWith(assetsDir + '\\')) {
      continue
    }

    if (isExcludedFile(originFile)) {
      console.log(`✗ Excluded: ${originFile}`)
      continue
    }

    const isComponentFile =
      componentsEnabled &&
      (relativePath.startsWith(componentsDir + '/') || relativePath.startsWith(componentsDir + '\\'))

    let destinationFile = join(destination, relative(source, originFile))

    if (isComponentFile && !f.name.endsWith('.astro')) {
      const nameWithoutExt = f.name.replace(/\.[^.]+$/, '')
      destinationFile = join(dirname(destinationFile), `${nameWithoutExt}.astro`)
    }
    await mkdir(dirname(destinationFile), {recursive: true})

    if (isComponentFile) {
      await copyFile(originFile, destinationFile)
      console.log(`→ ${originFile} → ${destinationFile}`)
      continue
    }

    if (f.name.match(ALL_MARKDOWN_EXTENSIONS)) {
      let content = await readFile(originFile, 'utf-8')

      let workingDestinationFile = destinationFile
      const basename = f.name.replace(/\.(md|mdx|mdoc)$/i, '')
      const extension = f.name.match(/\.(md|mdx|mdoc)$/i)?.[0]

      if (basename.match(/^(readme|README|Readme)$/)) {
        const sourceDir = dirname(originFile)
        const indexExists = ['md', 'mdx', 'mdoc'].some(ext => existsSync(join(sourceDir, `index.${ext}`)))

        if (!indexExists) {
          workingDestinationFile = join(dirname(destinationFile), `index${extension}`)
          console.log(`→ Renaming README to index: ${f.name} → index${extension}`)
        }
      }

      const {content: transformed, format} = await transformMarkdownSyntax(
        originFile,
        workingDestinationFile,
        content,
        {
          hierarchicalConfigs,
          sourceDir: source,
          isUnlisted: isUnlistedFile(originFile),
          customComponents: discoveredComponents,
        }
      )

      const finalDestinationFile = getTargetExtension(workingDestinationFile, format)

      const originalRelPath = relative(destination, destinationFile)
      const finalRelPath = relative(destination, finalDestinationFile)
      fileConversionMap.set(originalRelPath, finalRelPath)

      const frontmatter = parseFrontmatter(content)
      const title = frontmatter?.title || getTitle(originFile, content)

      const slug = finalRelPath
        .replace(/\.(md|mdx|mdoc)$/, '')
        .replace(/\/index$/, '')
        .toLowerCase()

      docs.push({
        slug,
        title,
        files: {
          source: originFile,
          workspace: finalDestinationFile,
        },
      })

      await writeFile(finalDestinationFile, transformed)
      console.log(`→ ${originFile} → ${finalDestinationFile}`)
    } else {
      await copyFile(originFile, destinationFile)
      console.log(`→ ${originFile} → ${destinationFile}`)
    }
  }

  await updatePartialReferences(destination, fileConversionMap)

  const manifestPath = join(destination, 'manifest.json')
  const manifest = {docs}
  if (discoveredComponents.length > 0) {
    manifest.components = {
      directory: componentsDir,
      items: discoveredComponents,
    }
  }
  if (discoveredCss.length > 0) {
    manifest.css = {
      items: discoveredCss,
    }
  }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
  console.log(`→ Saved manifest: ${manifestPath}`)

  console.log('✓ Processing complete')
  return true
}
