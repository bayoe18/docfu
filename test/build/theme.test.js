/**
 * Theme configuration tests
 * Tests that theme can be configured in docfu.yml
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, readFileSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, createFixtures, cleanupTestFile} from '../helpers.js'

describe('Theme Configuration', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should build with nova theme when configured', async () => {
    const paths = getTestPaths('theme-nova', import.meta.url)
    await createFixtures(paths, 'theme-nova', ['docfu.yml', 'index.md'])

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build with nova theme should succeed')
    assert.ok(existsSync(join(paths.dist, 'index.html')), 'Should generate index.html')

    const html = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(html.includes('Testing Nova theme'), 'HTML should contain source content')
  })

  it('should build with starlight default theme when configured', async () => {
    const paths = getTestPaths('theme-starlight', import.meta.url)
    await createFixtures(paths, 'theme-starlight', ['docfu.yml', 'index.md'])

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build with starlight theme should succeed')
    assert.ok(existsSync(join(paths.dist, 'index.html')), 'Should generate index.html')

    const html = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(html.includes('Testing Starlight default theme'), 'HTML should contain source content')
  })

  it('should default to nova theme when no theme specified', async () => {
    const paths = getTestPaths('theme-default', import.meta.url)
    await createFixtures(paths, 'build', ['docfu.yml', 'index.md'])

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build with default theme should succeed')
    assert.ok(existsSync(join(paths.dist, 'index.html')), 'Should generate index.html')
  })
})
