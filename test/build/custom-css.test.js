/**
 * CSS auto-discovery tests
 * Tests that CSS files in assets/ are automatically discovered and loaded
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, readFileSync, writeFileSync, mkdirSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, cleanupTestFile, createInlineFixtures} from '../helpers.js'

describe('Custom CSS Auto-Discovery', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should discover and load single CSS file from assets', async () => {
    const paths = getTestPaths('css-single', import.meta.url)

    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home\n\nContent',
    })

    mkdirSync(join(paths.source, 'assets'), {recursive: true})
    writeFileSync(join(paths.source, 'assets', 'custom.css'), '.custom { color: blue; }')

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with custom CSS')

    // Verify CSS copied to workspace
    assert.ok(existsSync(join(paths.workspace, 'assets', 'custom.css')), 'CSS should be in workspace')

    // Verify manifest contains CSS entry
    const manifest = JSON.parse(readFileSync(join(paths.workspace, 'manifest.json'), 'utf-8'))
    assert.ok(manifest.css, 'Manifest should have css section')
    assert.strictEqual(manifest.css.items.length, 1, 'Should have 1 CSS file')
    assert.strictEqual(manifest.css.items[0].path, 'assets/custom.css', 'CSS path should be correct')

    // Verify HTML references CSS
    const html = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(html.includes('custom.css') || html.includes('.css'), 'HTML should reference CSS')
  })

  it('should discover multiple CSS files in alphabetical order', async () => {
    const paths = getTestPaths('css-multiple', import.meta.url)

    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home\n\nContent',
    })

    mkdirSync(join(paths.source, 'assets'), {recursive: true})
    writeFileSync(join(paths.source, 'assets', 'brand.css'), '.brand { color: red; }')
    writeFileSync(join(paths.source, 'assets', 'custom.css'), '.custom { color: blue; }')
    writeFileSync(join(paths.source, 'assets', 'theme.css'), '.theme { color: green; }')

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with multiple CSS files')

    // Verify all CSS files copied to workspace
    assert.ok(existsSync(join(paths.workspace, 'assets', 'brand.css')), 'brand.css should be in workspace')
    assert.ok(existsSync(join(paths.workspace, 'assets', 'custom.css')), 'custom.css should be in workspace')
    assert.ok(existsSync(join(paths.workspace, 'assets', 'theme.css')), 'theme.css should be in workspace')

    // Verify manifest contains all CSS files in alphabetical order
    const manifest = JSON.parse(readFileSync(join(paths.workspace, 'manifest.json'), 'utf-8'))
    assert.strictEqual(manifest.css.items.length, 3, 'Should have 3 CSS files')
    assert.strictEqual(manifest.css.items[0].path, 'assets/brand.css', 'First should be brand.css')
    assert.strictEqual(manifest.css.items[1].path, 'assets/custom.css', 'Second should be custom.css')
    assert.strictEqual(manifest.css.items[2].path, 'assets/theme.css', 'Third should be theme.css')
  })

  it('should discover nested CSS files and preserve structure', async () => {
    const paths = getTestPaths('css-nested', import.meta.url)

    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home\n\nContent',
    })

    mkdirSync(join(paths.source, 'assets', 'styles', 'components'), {recursive: true})
    writeFileSync(join(paths.source, 'assets', 'base.css'), '.base { color: black; }')
    writeFileSync(join(paths.source, 'assets', 'styles', 'custom.css'), '.custom { color: blue; }')
    writeFileSync(join(paths.source, 'assets', 'styles', 'components', 'button.css'), '.button { color: white; }')

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with nested CSS')

    // Verify nested structure preserved in workspace
    assert.ok(existsSync(join(paths.workspace, 'assets', 'base.css')), 'base.css should be in workspace')
    assert.ok(
      existsSync(join(paths.workspace, 'assets', 'styles', 'custom.css')),
      'nested custom.css should be in workspace'
    )
    assert.ok(
      existsSync(join(paths.workspace, 'assets', 'styles', 'components', 'button.css')),
      'deeply nested button.css should be in workspace'
    )

    // Verify manifest preserves nested paths
    const manifest = JSON.parse(readFileSync(join(paths.workspace, 'manifest.json'), 'utf-8'))
    assert.strictEqual(manifest.css.items.length, 3, 'Should have 3 CSS files')
    assert.ok(
      manifest.css.items.some(item => item.path === 'assets/base.css'),
      'Should include base.css'
    )
    assert.ok(
      manifest.css.items.some(item => item.path === 'assets/styles/custom.css'),
      'Should include nested custom.css'
    )
    assert.ok(
      manifest.css.items.some(item => item.path === 'assets/styles/components/button.css'),
      'Should include deeply nested button.css'
    )
  })

  it('should build successfully without custom CSS files', async () => {
    const paths = getTestPaths('css-none', import.meta.url)

    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home\n\nContent without custom CSS',
    })

    // Create assets directory with non-CSS files
    mkdirSync(join(paths.source, 'assets', 'images'), {recursive: true})
    writeFileSync(join(paths.source, 'assets', 'images', 'logo.png'), 'fake-png')

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed without CSS files')

    // Verify manifest doesn't have css section (or has empty items)
    const manifest = JSON.parse(readFileSync(join(paths.workspace, 'manifest.json'), 'utf-8'))
    assert.ok(!manifest.css || manifest.css.items.length === 0, 'Manifest should not have CSS items')

    // Verify HTML still generated correctly
    const html = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(html.includes('Content without custom CSS'), 'HTML should contain page content')
  })
})
