/**
 * CLI tests for complete build artifacts
 * Tests 404 page content, sitemap, meta tags, OpenGraph
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, readFileSync, writeFileSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, cleanupTestFile, createInlineFixtures} from '../helpers.js'

describe('Build Artifacts', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should generate 404 page with content', async () => {
    const paths = getTestPaths('artifacts-404', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test Docs\n  url: https://test.example.com',
      'index.md': '# Home\n\nWelcome',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')
    assert.ok(existsSync(join(paths.dist, '404.html')), 'Should generate 404.html')

    const html404 = readFileSync(join(paths.dist, '404.html'), 'utf-8')
    assert.ok(html404.includes('404') || html404.includes('not found'), 'Should mention 404 or not found')
    assert.ok(html404.includes('<html') && html404.includes('</html>'), 'Should be valid HTML')
    assert.ok(html404.includes('Test Docs'), 'Should include site name')
  })

  it('should include OpenGraph meta tags', async () => {
    const paths = getTestPaths('artifacts-og-tags', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test Documentation\n  url: https://docs.example.com',
      'index.md': '---\ntitle: Welcome\ndescription: Test documentation site\n---\n\n# Welcome\n\nContent here.',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')

    assert.ok(indexHtml.includes('og:title') || indexHtml.includes('property="og:title"'), 'Should have og:title')
    assert.ok(
      indexHtml.includes('og:site_name') || indexHtml.includes('Test Documentation'),
      'Should have site name meta'
    )

    assert.ok(indexHtml.includes('<meta'), 'Should have meta tags')
    assert.ok(indexHtml.includes('description'), 'Should have description meta tag')
  })

  it('should generate valid HTML structure', async () => {
    const paths = getTestPaths('artifacts-html-valid', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'page.md': '# Page\n\nContent with **bold** and *italic*.',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const html = readFileSync(join(paths.dist, 'page/index.html'), 'utf-8')

    assert.ok(html.includes('<!DOCTYPE html>') || html.includes('<!doctype html>'), 'Should have DOCTYPE')
    assert.ok(html.includes('<html'), 'Should have html tag')
    assert.ok(html.includes('<head>'), 'Should have head section')
    assert.ok(html.includes('<body>') || html.includes('<body '), 'Should have body section')
    assert.ok(html.includes('</html>'), 'Should close html tag')

    assert.ok(html.includes('<meta charset='), 'Should have charset meta')
    assert.ok(html.includes('<title>'), 'Should have title tag')
    assert.ok(html.includes('viewport'), 'Should have viewport meta')
  })

  it('should include CSS and JS assets with proper references', async () => {
    const paths = getTestPaths('artifacts-assets-refs', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home\n\nContent',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')

    assert.ok(indexHtml.includes('.css') || indexHtml.includes('stylesheet'), 'Should reference CSS files')

    assert.ok(indexHtml.includes('.js') || indexHtml.includes('script'), 'Should reference JS files')

    assert.ok(existsSync(join(paths.dist, '_astro')), 'Should have _astro assets directory')
  })

  it('should generate sitemap if configured', async () => {
    const paths = getTestPaths('artifacts-sitemap', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.example.com',
      'index.md': '# Home',
      'about.md': '# About',
      'guide.md': '# Guide',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const sitemapPath = join(paths.dist, 'sitemap-index.xml')
    if (existsSync(sitemapPath)) {
      const sitemap = readFileSync(sitemapPath, 'utf-8')
      assert.ok(sitemap.includes('<?xml'), 'Sitemap should be XML')
      assert.ok(sitemap.includes('sitemap'), 'Should be a sitemap')
    }
  })

  it('should include favicon if provided', async () => {
    const paths = getTestPaths('artifacts-favicon', import.meta.url)

    const {mkdirSync, writeFileSync} = await import('fs')
    mkdirSync(join(paths.source, 'public'), {recursive: true})

    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(paths.source, 'index.md'), '# Home')
    writeFileSync(join(paths.source, 'public', 'favicon.ico'), 'fake-favicon-data')

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with favicon')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(indexHtml.includes('favicon') || indexHtml.includes('icon'), 'Should reference favicon')
  })

  it('should have proper heading hierarchy in HTML', async () => {
    const paths = getTestPaths('artifacts-heading-hierarchy', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'hierarchy.md': `# Main Title

## Section 1

Content here.

### Subsection 1.1

More content.

## Section 2

Final content.`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const html = readFileSync(join(paths.dist, 'hierarchy/index.html'), 'utf-8')

    assert.ok(html.match(/<h1/i), 'Should have h1 tag')
    assert.ok(html.match(/<h2/i), 'Should have h2 tags')
    assert.ok(html.match(/<h3/i), 'Should have h3 tags')

    // Headings should have IDs for anchor links
    assert.ok(html.includes('id="section-1"') || html.includes('id="Section-1"'), 'h2 should have ID')
  })

  it('should preserve assets directory structure in build', async () => {
    const paths = getTestPaths('artifacts-asset-structure', import.meta.url)

    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home\n\n![Logo](./images/logo.png)',
      'images/icons/small.svg': '<svg></svg>',
    })

    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    writeFileSync(join(paths.source, 'images', 'logo.png'), pngData)

    const {exitCode, stderr, stdout} = await runCLI([
      'build',
      paths.source,
      '--workspace',
      paths.workspace,
      '--dist',
      paths.dist,
    ])

    assert.strictEqual(exitCode, 0, 'Build should succeed')
    assert.ok(existsSync(join(paths.workspace, 'images', 'logo.png')), 'Should copy images to workspace')
    assert.ok(existsSync(join(paths.workspace, 'images', 'icons', 'small.svg')), 'Should preserve asset structure')
  })

  it('should have accessible navigation structure', async () => {
    const paths = getTestPaths('artifacts-nav-accessible', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test Docs\n  url: https://test.com',
      'index.md': '# Home',
      'guide.md': '# Guide',
      'api.md': '# API',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')

    assert.ok(indexHtml.includes('<nav'), 'Should have nav element')

    assert.ok(indexHtml.includes('Guide') || indexHtml.includes('guide'), 'Nav should include Guide')
    assert.ok(indexHtml.includes('API') || indexHtml.includes('api'), 'Nav should include API')
  })
})
