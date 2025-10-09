/**
 * CLI tests for build command
 * Tests prepare phase and build command options
 * Note: Full Astro builds are slow and tested separately
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, readFileSync, readdirSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, createFixtures, cleanupTestFile} from '../helpers.js'

describe('Build Command', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should prepare files for build', async () => {
    const paths = getTestPaths('build-prepare', import.meta.url)
    await createFixtures(paths, 'build', ['docfu.yml', 'index.md', 'guide.md'])

    // Use prepare instead of full build to keep tests fast
    const {exitCode, stdout} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    assert.strictEqual(exitCode, 0, 'Prepare should succeed')
    assert.ok(stdout.includes('Processing docs'), 'Should show processing message')
    assert.ok(existsSync(paths.workspace), 'Should create workspace directory')
    assert.ok(existsSync(join(paths.workspace, 'index.md')), 'Should process index.md')
    assert.ok(existsSync(join(paths.workspace, 'guide.md')), 'Should process guide.md')
  })

  it('should support --dry-run flag', async () => {
    const paths = getTestPaths('build-dry-run', import.meta.url)
    await createFixtures(paths, 'build', ['docfu.yml', 'index.md'])

    const {exitCode, stdout} = await runCLI([
      'build',
      paths.source,
      '--workspace',
      paths.workspace,
      '--dist',
      paths.dist,
      '--dry-run',
    ])

    assert.strictEqual(exitCode, 0, 'Should succeed')
    assert.ok(stdout.includes('Configuration validated'), 'Should validate config')
    assert.ok(stdout.includes('dry-run mode'), 'Should mention dry-run')
    assert.ok(!existsSync(paths.dist), 'Should not create dist directory in dry-run')
  })

  it('should accept prepare command explicitly', async () => {
    const paths = getTestPaths('build-explicit', import.meta.url)
    await createFixtures(paths, 'build', ['docfu.yml', 'index.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    assert.strictEqual(exitCode, 0, 'Should succeed with prepare command')
    assert.ok(existsSync(paths.workspace), 'Should create workspace directory')
  })

  it('should support custom workspace directory', async () => {
    const paths = getTestPaths('build-custom-paths', import.meta.url)
    const customWorkspace = `${paths.workspace}-custom`

    await createFixtures(paths, 'build', ['docfu.yml', 'index.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', customWorkspace])

    assert.strictEqual(exitCode, 0, 'Should succeed')
    assert.ok(existsSync(customWorkspace), 'Should create custom workspace')
  })

  it('should complete full build pipeline with Astro', async () => {
    const paths = getTestPaths('build-full', import.meta.url)
    await createFixtures(paths, 'build', ['docfu.yml', 'index.md'])

    const {exitCode, stdout} = await runCLI([
      'build',
      paths.source,
      '--workspace',
      paths.workspace,
      '--dist',
      paths.dist,
    ])

    assert.strictEqual(exitCode, 0, 'Full build should succeed')
    assert.ok(stdout.includes('Processing docs'), 'Should show processing')
    assert.ok(stdout.includes('Building site'), 'Should show building')
    assert.ok(existsSync(paths.dist), 'Should create dist directory')
    assert.ok(existsSync(join(paths.dist, 'index.html')), 'Should generate index.html')

    const html = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(html.includes('Welcome to the test documentation'), 'HTML should contain source content')
    assert.ok(html.includes('Home'), 'HTML should contain title')

    assert.ok(html.includes('<nav'), 'Should generate sidebar navigation')
  })

  it('should use build as default command when no command specified', async () => {
    const paths = getTestPaths('build-default-cmd', import.meta.url)
    await createFixtures(paths, 'build', ['docfu.yml', 'index.md'])

    // No command specified - should default to build
    const {exitCode} = await runCLI([paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Default build should succeed')
    assert.ok(existsSync(paths.dist), 'Should create dist directory')
    assert.ok(existsSync(join(paths.dist, 'index.html')), 'Should generate index.html')

    // Verify HTML content contains expected text from source markdown
    const html = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(html.includes('Welcome to the test documentation'), 'HTML should contain source content')
    assert.ok(html.includes('Home'), 'HTML should contain title')
  })

  it('should build comprehensive site with all features', async () => {
    const paths = getTestPaths('build-comprehensive', import.meta.url)
    await createFixtures(paths, 'build-comprehensive', [
      'docfu.yml',
      'index.md',
      'with-components.md',
      'with-markdoc.md',
      'partials/snippet.md',
      'guides/getting-started.md',
      'api/reference.md',
    ])

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Comprehensive build should succeed')

    // ========================================
    // WORKSPACE ARTIFACTS VERIFICATION
    // ========================================

    // Verify workspace configuration files
    assert.ok(existsSync(join(paths.workspace, 'docfu.yml')), 'Should create docfu.yml')
    assert.ok(existsSync(join(paths.workspace, 'manifest.json')), 'Should create manifest.json')

    // Verify manifest.json content
    const manifestPath = join(paths.workspace, 'manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    assert.strictEqual(manifest.docs.length, 6, 'Manifest should contain all 6 pages')
    const indexDoc = manifest.docs.find(d => d.slug === 'index' || d.slug === '')
    assert.ok(indexDoc, 'Manifest should include index page')
    assert.strictEqual(indexDoc.title, 'Home', 'Index should have correct title')
    assert.ok(
      manifest.docs.find(d => d.slug === 'with-components'),
      'Manifest should include with-components'
    )
    assert.ok(
      manifest.docs.find(d => d.title === 'Page with Components'),
      'Manifest should extract correct title from H1'
    )
    assert.ok(
      manifest.docs.find(d => d.slug === 'guides/getting-started'),
      'Manifest should include nested pages'
    )

    // Verify processed .mdx file has component imports and frontmatter
    const mdxPath = join(paths.workspace, 'with-components.mdx')
    assert.ok(existsSync(mdxPath), 'Should convert to .mdx')
    const mdxContent = readFileSync(mdxPath, 'utf-8')
    assert.ok(mdxContent.includes('import'), 'Should have import statement')
    assert.ok(mdxContent.includes('Card'), 'Should import Card component')
    assert.ok(mdxContent.includes('Badge'), 'Should import Badge component')
    assert.ok(mdxContent.includes('@astrojs/starlight/components'), 'Should import from Starlight')
    assert.ok(mdxContent.includes('---\ntitle:'), 'Should have frontmatter with title')
    assert.ok(mdxContent.includes('title: Page with Components'), 'Should extract title from H1')

    // Verify processed .mdoc file has Markdoc syntax and frontmatter
    const mdocPath = join(paths.workspace, 'with-markdoc.mdoc')
    assert.ok(existsSync(mdocPath), 'Should convert to .mdoc')
    const mdocContent = readFileSync(mdocPath, 'utf-8')
    assert.ok(mdocContent.includes('## Important Note {% #important'), 'Should preserve heading badges')
    assert.ok(mdocContent.includes('{% partial file='), 'Should preserve partial tag')
    assert.ok(mdocContent.includes('title: Page with Markdoc'), 'Should have title in frontmatter')

    // Verify plain markdown has frontmatter
    const indexMdPath = join(paths.workspace, 'index.md')
    const indexMdContent = readFileSync(indexMdPath, 'utf-8')
    assert.ok(indexMdContent.includes('title: Home'), 'Plain markdown should have title injected')
    assert.ok(!indexMdContent.includes('# Home\n'), 'Should remove H1 after extracting title')

    // ========================================
    // HTML BUILD ARTIFACTS VERIFICATION
    // ========================================

    // Verify all expected HTML pages were generated
    assert.ok(existsSync(join(paths.dist, 'index.html')), 'Should generate index.html')
    assert.ok(existsSync(join(paths.dist, 'with-components/index.html')), 'Should generate with-components page')
    assert.ok(existsSync(join(paths.dist, 'with-markdoc/index.html')), 'Should generate with-markdoc page')
    assert.ok(existsSync(join(paths.dist, 'guides/getting-started/index.html')), 'Should generate nested guides page')
    assert.ok(existsSync(join(paths.dist, 'api/reference/index.html')), 'Should generate nested api page')

    // Verify build assets exist
    assert.ok(existsSync(join(paths.dist, '_astro')), 'Should create _astro directory')
    const astroFiles = readdirSync(join(paths.dist, '_astro'))
    const cssFiles = astroFiles.filter(f => f.endsWith('.css'))
    const jsFiles = astroFiles.filter(f => f.endsWith('.js'))
    assert.ok(cssFiles.length > 0, 'Should generate CSS files')
    assert.ok(jsFiles.length > 0, 'Should generate JavaScript bundles')
    assert.ok(existsSync(join(paths.dist, '404.html')), 'Should generate 404 page')

    // ========================================
    // HTML CONTENT & STRUCTURE VERIFICATION
    // ========================================

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')

    // Verify HTML title tags
    assert.ok(indexHtml.includes('<title>Home'), 'Should have title tag with page title')
    assert.ok(indexHtml.includes('Test Documentation'), 'Title should include site name')

    // Verify semantic HTML structure
    assert.ok(indexHtml.match(/<nav[^>]*>/i), 'Should have navigation element')
    assert.ok(indexHtml.match(/<main[^>]*>/i), 'Should have main content element')

    // Verify MDX component rendering in HTML
    const componentsHtml = readFileSync(join(paths.dist, 'with-components/index.html'), 'utf-8')
    assert.ok(componentsHtml.includes('Test Card'), 'Should render Card component content')
    assert.ok(componentsHtml.includes('Success Badge'), 'Should render Badge component content')
    assert.ok(componentsHtml.includes('This is a card component'), 'Should render card body')
    assert.ok(componentsHtml.match(/<[^>]*class="[^"]*card/i), 'Card should render as HTML element with class')

    // Verify Markdoc conversion in HTML
    const markdocHtml = readFileSync(join(paths.dist, 'with-markdoc/index.html'), 'utf-8')
    assert.ok(markdocHtml.includes('id="important"'), 'Should convert heading badge ID to HTML id attribute')
    assert.ok(markdocHtml.includes('reusable snippet from a partial'), 'Should include and render partial content')

    // Verify navigation/sidebar includes all pages
    assert.ok(
      indexHtml.includes('Getting Started') || indexHtml.includes('getting-started'),
      'Sidebar should include nested page from guides/'
    )
    assert.ok(
      indexHtml.includes('API Reference') || indexHtml.includes('reference'),
      'Sidebar should include nested page from api/'
    )
  })
})
