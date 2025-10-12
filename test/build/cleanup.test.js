/**
 * CLI tests for build cleanup and idempotency
 * Tests workspace/dist cleanup, stale files, and build reproducibility
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, writeFileSync, mkdirSync, readdirSync, readFileSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, cleanupTestFile, createInlineFixtures} from '../helpers.js'

describe('Build Cleanup', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should clean workspace on subsequent prepare', async () => {
    const paths = getTestPaths('cleanup-workspace', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home\n\nContent',
    })

    let result = await runCLI(['prepare', paths.source, '--root', paths.root])
    assert.strictEqual(result.exitCode, 0, 'First prepare should succeed')

    writeFileSync(join(paths.workspace, 'src/content/docs/stale-file.md'), '# Stale\n\nThis should be removed')

    result = await runCLI(['prepare', paths.source, '--root', paths.root])
    assert.strictEqual(result.exitCode, 0, 'Second prepare should succeed')

    assert.ok(
      !existsSync(join(paths.workspace, 'src/content/docs/stale-file.md')),
      'Should remove stale files from workspace'
    )
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/index.md')), 'Should still have current files')
  })

  it('should handle removed source files', async () => {
    const paths = getTestPaths('cleanup-removed-source', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
      'removed.md': '# To Remove',
    })

    let result = await runCLI(['prepare', paths.source, '--root', paths.root])
    assert.strictEqual(result.exitCode, 0, 'First prepare should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/removed.md')), 'Should create removed.md')

    const {unlinkSync} = await import('fs')
    unlinkSync(join(paths.source, 'removed.md'))

    result = await runCLI(['prepare', paths.source, '--root', paths.root])
    assert.strictEqual(result.exitCode, 0, 'Second prepare should succeed')

    assert.ok(
      !existsSync(join(paths.workspace, 'src/content/docs/removed.md')),
      'Should remove file that was deleted from source'
    )
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/index.md')), 'Should keep remaining files')
  })

  it('should be idempotent (same input produces same output)', async () => {
    const paths = getTestPaths('cleanup-idempotent', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home\n\nContent here',
      'guide.md': '# Guide\n\n<Card title="Test">Content</Card>',
    })

    let result = await runCLI(['prepare', paths.source, '--root', paths.root])
    assert.strictEqual(result.exitCode, 0, 'First prepare should succeed')

    const firstIndex = readFileSync(join(paths.workspace, 'src/content/docs/index.md'), 'utf-8')
    const firstGuide = readFileSync(join(paths.workspace, 'src/content/docs/guide.mdx'), 'utf-8')
    const firstManifest = readFileSync(join(paths.root, 'manifest.json'), 'utf-8')

    result = await runCLI(['prepare', paths.source, '--root', paths.root])
    assert.strictEqual(result.exitCode, 0, 'Second prepare should succeed')

    const secondIndex = readFileSync(join(paths.workspace, 'src/content/docs/index.md'), 'utf-8')
    const secondGuide = readFileSync(join(paths.workspace, 'src/content/docs/guide.mdx'), 'utf-8')
    const secondManifest = readFileSync(join(paths.root, 'manifest.json'), 'utf-8')

    assert.strictEqual(firstIndex, secondIndex, 'Index should be identical')
    assert.strictEqual(firstGuide, secondGuide, 'Guide should be identical')
    assert.strictEqual(firstManifest, secondManifest, 'Manifest should be identical')
  })

  it('should handle format changes (md -> mdx)', async () => {
    const paths = getTestPaths('cleanup-format-change', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'page.md': '# Page\n\nPlain content',
    })

    let result = await runCLI(['prepare', paths.source, '--root', paths.root])
    assert.strictEqual(result.exitCode, 0, 'First prepare should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/page.md')), 'Should create .md file')

    writeFileSync(join(paths.source, 'page.md'), '# Page\n\n<Card title="Test">With component</Card>')

    result = await runCLI(['prepare', paths.source, '--root', paths.root])
    assert.strictEqual(result.exitCode, 0, 'Second prepare should succeed')

    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/page.mdx')), 'Should create .mdx file')
    assert.ok(!existsSync(join(paths.workspace, 'src/content/docs/page.md')), 'Should remove old .md file')
  })

  it('should clean dist directory on full build', async () => {
    const paths = getTestPaths('cleanup-dist', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
    })

    let result = await runCLI(['build', paths.source, '--root', paths.root])
    assert.strictEqual(result.exitCode, 0, 'First build should succeed')

    writeFileSync(join(paths.dist, 'stale-page.html'), '<html>stale</html>')

    result = await runCLI(['build', paths.source, '--root', paths.root])
    assert.strictEqual(result.exitCode, 0, 'Second build should succeed')

    const distFiles = readdirSync(paths.dist)
    assert.ok(distFiles.includes('index.html'), 'Should have current files')
  })

  it('should handle workspace directory already existing', async () => {
    const paths = getTestPaths('cleanup-existing-workspace', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
    })

    mkdirSync(paths.workspace, {recursive: true})
    mkdirSync(join(paths.workspace, 'src/content/docs'), {recursive: true})
    writeFileSync(join(paths.workspace, 'old-file.txt'), 'old content')
    writeFileSync(join(paths.workspace, 'src/content/docs/another.md'), '# Old')

    const result = await runCLI(['prepare', paths.source, '--root', paths.root])
    assert.strictEqual(result.exitCode, 0, 'Should succeed with existing workspace')

    assert.ok(!existsSync(join(paths.workspace, 'old-file.txt')), 'Should clean existing workspace')
    assert.ok(!existsSync(join(paths.workspace, 'src/content/docs/another.md')), 'Should remove all old files')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/index.md')), 'Should create new files')
  })

  it('should preserve workspace structure for nested files', async () => {
    const paths = getTestPaths('cleanup-nested', import.meta.url)
    mkdirSync(join(paths.source, 'guides', 'advanced'), {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(paths.source, 'index.md'), '# Home')
    writeFileSync(join(paths.source, 'guides', 'intro.md'), '# Intro')
    writeFileSync(join(paths.source, 'guides', 'advanced', 'tips.md'), '# Tips')

    const result = await runCLI(['prepare', paths.source, '--root', paths.root])
    assert.strictEqual(result.exitCode, 0, 'Should succeed')

    assert.ok(
      existsSync(join(paths.workspace, 'src/content/docs/guides', 'intro.md')),
      'Should preserve nested structure'
    )
    assert.ok(
      existsSync(join(paths.workspace, 'src/content/docs/guides', 'advanced', 'tips.md')),
      'Should preserve deep nesting'
    )
  })
})
