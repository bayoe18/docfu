/**
 * @fileoverview Main processing engine for DocFu
 * Handles transforming, converting, and preparing markdown files from external sources
 */

import {mkdir, copyFile, readdir, readFile, writeFile, cp, symlink} from 'fs/promises'
import {createInterface} from 'readline'
import {homedir} from 'os'
import {fileURLToPath} from 'url'
import {resolve, join, relative, dirname, sep} from 'path'
import {existsSync} from 'fs'
import {minimatch} from 'minimatch'
import {deleteSync} from 'del'
import * as yaml from 'js-yaml'
import theme from '../cli/theme.js'
import {getTitle, parseFrontmatter, ensureTitle, mergeFrontmatterWithHierarchicalConfig} from './frontmatter.js'
import {process as mdx} from './md2mdx.js'
import {process as mdoc} from './md2mdoc.js'
import {getTargetFormat, getTargetExtension} from './syntax.js'
import {ALL_MARKDOWN_EXTENSIONS} from './patterns.js'
import {discover, getApplicable} from './config.js'
import {transformReadmeLinks} from './ast.js'

const DEFAULT_ROOT = '.docfu'

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
 * @param {Object} [options] - Options object
 * @param {boolean} [options.yes] - Skip confirmation if true
 * @returns {Promise<boolean>} True if user confirmed, false otherwise
 */
const confirm = (message, options = {}) => {
  if (process.env.CI || options.yes) return Promise.resolve(true)

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
 * Check if a path is dangerous to delete (critical system directories)
 * This provides an additional safety layer beyond del's built-in protections
 * @param {string} path - Absolute path to check
 * @returns {boolean} True if path is a critical system directory
 */
const isDangerousSystemPath = path => {
  const home = homedir()
  const normalizedPath = resolve(path)

  const dangerous = [
    '/', // Root filesystem
    home, // User home directory
    join(home, 'Documents'), // User documents
    join(home, 'Desktop'), // User desktop
    join(home, 'Downloads'), // User downloads
    dirname(home), // Parent of home (/Users, /home, C:\Users)
    '/etc', // Unix: system configuration
    '/usr', // Unix: user programs and libraries
    '/bin', // Unix: essential binaries
    '/sbin', // Unix: system binaries
    '/var', // Unix: variable data, logs, databases
    '/Applications', // macOS: applications directory
    '/System', // macOS: system files
    '/Library', // macOS: system library
    'C:\\Windows', // Windows: system directory
    'C:\\Program Files', // Windows: installed programs
    'C:\\Program Files (x86)', // Windows: 32-bit programs
  ]

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
 * Main processing function that transforms and prepares documentation files
 * @param {string} [source] - Source directory path (defaults to getSource())
 * @param {string} [root] - Root directory path (defaults to env var or DEFAULT_ROOT)
 * @param {Object} [options] - Processing options
 * @param {boolean} [options.yes] - Skip confirmation prompts
 * @returns {Promise<boolean>} True if processing completed successfully, false otherwise
 */
export async function processDocuments(source, root, options = {}) {
  source = source || getSource()

  // Determine root directory (.docfu by default)
  // Priority: 1. Function parameter, 2. DOCFU_ROOT env var, 3. Default
  root = resolve(root || process.env.DOCFU_ROOT || DEFAULT_ROOT)
  const workspace = join(root, 'workspace')
  const dist = join(root, 'dist')
  const destination = join(workspace, 'src/content/docs')

  console.log(`Processing docs:`)
  console.log(`  Source: ${source}`)
  console.log(`  Root: ${root}`)
  console.log(`  Workspace: ${workspace}`)
  console.log(`  Build output: ${dist}`)

  if (!existsSync(source)) {
    console.error(`✗ Source directory not found: ${source}`)
    return false
  }

  // Additional safety layer beyond del's built-in protections
  if (isDangerousSystemPath(root)) {
    console.error(`✗ DANGER: Root path is a critical system directory: ${root}`)
    console.error(`  Refusing to delete: home, root, Documents, Desktop, or Downloads.`)
    console.error(`  Please use a safe subdirectory for DOCFU_ROOT.`)
    process.exit(1)
  }

  // Prevent deleting source directory
  const normalizedRoot = resolve(root)
  const normalizedSource = resolve(source)

  if (normalizedRoot === normalizedSource) {
    console.error(`✗ DANGER: Root directory cannot be the same as source directory`)
    console.error(`  Root: ${root}`)
    console.error(`  Source: ${source}`)
    console.error(`  Please use a separate directory for DOCFU_ROOT (e.g., .docfu)`)
    process.exit(1)
  }

  // Prevent root from being a parent of source (would delete source when cleaning root)
  if (normalizedSource.startsWith(normalizedRoot + sep)) {
    console.error(`✗ DANGER: Source directory is inside root directory`)
    console.error(`  Root: ${root}`)
    console.error(`  Source: ${source}`)
    console.error(`  This would delete your source files when cleaning root.`)
    console.error(`  Please use a separate directory for DOCFU_ROOT (e.g., .docfu)`)
    process.exit(1)
  }

  // Clean root directory (safe to proceed: passed all safety checks above)
  if (existsSync(root)) {
    console.log(theme.danger('→ The following will be deleted:'))
    console.log(`  ${theme.warning(root)}`)

    const confirmed = await confirm('Delete and continue?', options)
    if (!confirmed) {
      console.log('✗ Operation cancelled by user')
      return false
    }

    console.log(`→ Cleaning root directory...`)
    // Delete entire root directory
    // Safe to proceed: passed all safety checks above + user confirmation
    deleteSync([root], {
      force: false, // Safety: refuse to delete outside cwd
      followSymbolicLinks: false, // Safety: don't follow symlinks
      dot: true, // Required: allow deleting dotfiles like .DS_Store within root directory
    })
  }

  // Create destination directory structure
  await mkdir(destination, {recursive: true})

  console.log(`→ Discovering docfu.yml configuration files...`)
  const {master: masterConfig, hierarchical: hierarchicalConfigs} = await discover(source)

  const assetsDir = masterConfig.assets || 'assets'
  const assets = join(source, assetsDir)
  const workspaceAssets = join(workspace, 'public', assetsDir)

  if (existsSync(assets)) {
    console.log(`→ Copying assets from ${assetsDir}/...`)
    await cp(assets, workspaceAssets, {recursive: true})
  }

  // Save config to DOCFU_ROOT/config.yml
  const configPath = join(root, 'config.yml')
  const sourceConfigPath = join(source, 'docfu.yml')

  // If no source docfu.yml exists, copy docfu.example.yml as template
  if (!existsSync(sourceConfigPath)) {
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const packageRoot = resolve(__dirname, '../..')
    const exampleConfigPath = join(packageRoot, 'docfu.example.yml')
    await copyFile(exampleConfigPath, configPath)
    console.log(`→ Config template copied: ${configPath}`)
  } else {
    // Otherwise save merged config from source
    await writeFile(configPath, yaml.dump(masterConfig))
    console.log(`→ Config saved: ${configPath}`)
  }

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
  // They will be copied to workspace/src/components/ during file processing loop below
  let discoveredComponents = []
  if (componentsEnabled) {
    const sourceComponentsPath = join(source, componentsDir)
    // Discover from source, but use relative paths for manifest
    const components = await discoverComponents(sourceComponentsPath, source)
    // Paths are relative to components directory (will be in src/components/)
    discoveredComponents = components.map(comp => ({
      ...comp,
      path: relative(join(source, componentsDir), join(source, comp.path)).replace(/\\/g, '/'),
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

    const relativePath = relative(source, originFile)

    // Always exclude .docfu directory to prevent recursive processing
    if (relativePath.startsWith('.docfu/') || relativePath.startsWith('.docfu\\')) {
      continue
    }

    const assetsDir = masterConfig.assets || 'assets'
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

    let destinationFile
    if (isComponentFile) {
      // Components go to workspace/src/components/
      const componentRelPath = relative(join(source, componentsDir), originFile)
      const nameWithoutExt = f.name.replace(/\.[^.]+$/, '')
      const finalFilename = f.name.endsWith('.astro') ? f.name : `${nameWithoutExt}.astro`
      destinationFile = join(workspace, 'src/components', dirname(componentRelPath), finalFilename)
    } else {
      // Markdown and other files go to workspace/src/content/docs/
      destinationFile = join(destination, relative(source, originFile))
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

  const manifestPath = join(root, 'manifest.json')
  const manifest = {
    config: masterConfig,
    docs,
  }
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
