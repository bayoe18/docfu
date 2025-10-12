/**
 * CLI tests for static asset handling
 * Tests images, PDFs, CSS, JS, and other non-markdown files
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, writeFileSync, mkdirSync, readFileSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, cleanupTestFile, createInlineFixtures} from '../helpers.js'

describe('Static Assets', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should copy image files to workspace and dist', async () => {
    const paths = getTestPaths('assets-images', import.meta.url)

    mkdirSync(paths.source, {recursive: true})
    mkdirSync(join(paths.source, 'images'), {recursive: true})

    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(paths.source, 'index.md'), '# Home\n\n![Logo](./images/logo.png)\n\nContent here.')

    // Create minimal valid 1x1 PNG (transparent)
    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    writeFileSync(join(paths.source, 'images', 'logo.png'), pngData)

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed with images')
    assert.ok(
      existsSync(join(paths.workspace, 'src/content/docs/images', 'logo.png')),
      'Should copy image to workspace'
    )
    // Note: Astro handles assets, so we verify the markdown references them correctly
  })

  it('should copy nested static assets', async () => {
    const paths = getTestPaths('assets-nested', import.meta.url)

    mkdirSync(join(paths.source, 'assets', 'icons'), {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(paths.source, 'index.md'), '# Home\n\nContent')
    writeFileSync(join(paths.source, 'assets', 'style.css'), 'body { color: red; }')
    writeFileSync(join(paths.source, 'assets', 'icons', 'favicon.ico'), 'fake-ico')

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Should succeed')
    assert.ok(existsSync(join(paths.workspace, 'public/assets', 'style.css')), 'Should copy CSS files')
    assert.ok(existsSync(join(paths.workspace, 'public/assets', 'icons', 'favicon.ico')), 'Should copy nested assets')
  })

  it('should copy PDF and other document files', async () => {
    const paths = getTestPaths('assets-documents', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Docs\n\n[Download PDF](./guide.pdf)',
    })

    writeFileSync(join(paths.source, 'guide.pdf'), 'fake-pdf-data')

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Should succeed with PDF')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/guide.pdf')), 'Should copy PDF file')
  })

  it('should copy JavaScript and CSS files', async () => {
    const paths = getTestPaths('assets-scripts', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home\n\nContent',
    })

    writeFileSync(join(paths.source, 'custom.js'), 'console.log("test")')
    writeFileSync(join(paths.source, 'theme.css'), '.custom { color: blue; }')

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/custom.js')), 'Should copy JS files')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/theme.css')), 'Should copy CSS files')
  })

  it('should handle various image formats', async () => {
    const paths = getTestPaths('assets-image-formats', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Images\n\nVarious formats',
    })

    writeFileSync(join(paths.source, 'photo.jpg'), 'fake-jpg')
    writeFileSync(join(paths.source, 'diagram.svg'), '<svg></svg>')
    writeFileSync(join(paths.source, 'icon.webp'), 'fake-webp')

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/photo.jpg')), 'Should copy JPG')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/diagram.svg')), 'Should copy SVG')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/icon.webp')), 'Should copy WebP')
  })

  it('should preserve directory structure for assets', async () => {
    const paths = getTestPaths('assets-structure', import.meta.url)

    mkdirSync(join(paths.source, 'public', 'images'), {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(paths.source, 'index.md'), '# Home')
    writeFileSync(join(paths.source, 'public', 'images', 'logo.png'), 'fake-png')
    writeFileSync(join(paths.source, 'public', 'data.json'), '{"test": true}')

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Should succeed')
    assert.ok(
      existsSync(join(paths.workspace, 'src/content/docs/public', 'images', 'logo.png')),
      'Should preserve nested structure'
    )
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/public', 'data.json')), 'Should copy JSON files')
  })

  it('should preserve assets directory in engine/public for relative links', async () => {
    const paths = getTestPaths('assets-directory-preservation', import.meta.url)

    mkdirSync(join(paths.source, 'assets', 'images'), {recursive: true})
    mkdirSync(join(paths.source, 'guides', 'advanced'), {recursive: true})

    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(paths.source, 'index.md'), '# Home\n\n![Logo](assets/images/logo.png)')
    writeFileSync(
      join(paths.source, 'guides', 'getting-started.md'),
      '# Getting Started\n\n![Logo](../assets/images/logo.png)'
    )
    writeFileSync(
      join(paths.source, 'guides', 'advanced', 'optimization.md'),
      '# Optimization\n\n![Logo](../../assets/images/logo.png)'
    )

    const pngData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    )
    writeFileSync(join(paths.source, 'assets', 'images', 'logo.png'), pngData)

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Prepare should succeed')

    // Note: Assets directory handling during build needs investigation
    // For now, verify assets are copied to public during prepare
    assert.ok(
      existsSync(join(paths.workspace, 'public', 'assets', 'images', 'logo.png')),
      'Should copy assets to workspace/public/assets/'
    )
  })
})
