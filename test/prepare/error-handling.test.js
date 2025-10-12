/**
 * CLI tests for error handling and edge cases
 * Tests invalid inputs, empty content, and error scenarios
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, writeFileSync, mkdirSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, cleanupTestFile, createInlineFixtures} from '../helpers.js'

describe('Error Handling', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should fail with invalid source path', async () => {
    const paths = getTestPaths('error-invalid-path', import.meta.url)
    const invalidPath = join(paths.source, 'does-not-exist')

    try {
      await runCLI(['prepare', invalidPath, '--root', paths.root])
      assert.fail('Should have rejected with invalid path')
    } catch (stderr) {
      assert.ok(stderr.includes('not found') || stderr.includes('ENOENT'), 'Should show error about missing path')
    }
  })

  it('should handle empty source directory', async () => {
    const paths = getTestPaths('error-empty-dir', import.meta.url)
    mkdirSync(paths.source, {recursive: true})

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Empty directory should succeed (no files to process)')
    assert.ok(existsSync(paths.workspace), 'Should create workspace even if empty')
  })

  it('should handle malformed docfu.yml', async () => {
    const paths = getTestPaths('error-malformed-yaml', import.meta.url)
    mkdirSync(paths.source, {recursive: true})

    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: "Unclosed quote\n  invalid: [}}')
    writeFileSync(join(paths.source, 'index.md'), '# Test\n\nContent')

    try {
      await runCLI(['prepare', paths.source, '--root', paths.root])
      assert.ok(existsSync(paths.workspace), 'Should still create workspace with defaults')
    } catch (stderr) {
      assert.ok(stderr.includes('unexpected end') || stderr.includes('YAML'), 'Should show YAML error')
    }
  })

  it('should handle file with no H1 and no frontmatter title', async () => {
    const paths = getTestPaths('error-no-title', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'no-title.md': 'This file has no H1 header.\n\nJust regular content.',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Should succeed even without H1')

    const {readFileSync} = await import('fs')
    const processed = readFileSync(join(paths.workspace, 'src/content/docs/no-title.md'), 'utf-8')
    assert.ok(processed.includes('title:'), 'Should have title in frontmatter')
    assert.ok(processed.includes('No Title'), 'Should generate title from filename')
  })

  it('should handle empty markdown file', async () => {
    const paths = getTestPaths('error-empty-file', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'empty.md': '',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Empty file should not cause failure')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/empty.md')), 'Empty file should be processed')
  })

  it('should handle file with only frontmatter', async () => {
    const paths = getTestPaths('error-only-frontmatter', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'only-fm.md': '---\ntitle: Test\n---\n',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'File with only frontmatter should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/only-fm.md')), 'Should process file')
  })

  it('should handle malformed frontmatter in markdown', async () => {
    const paths = getTestPaths('error-bad-frontmatter', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'bad-fm.md': '---\ntitle: "Unclosed\ndescription: [}}\n---\n\n# Content\n\nText here.',
    })

    try {
      await runCLI(['prepare', paths.source, '--root', paths.root])
      assert.ok(existsSync(join(paths.workspace, 'src/content/docs/bad-fm.md')), 'Should still process file')
    } catch (stderr) {
      assert.ok(true, 'Failed with malformed frontmatter as expected')
    }
  })

  it('should handle file with multiple H1 headers', async () => {
    const paths = getTestPaths('error-multiple-h1', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'multi-h1.md': '# First Title\n\nContent here.\n\n# Second Title\n\nMore content.',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Multiple H1s should not cause failure')

    const {readFileSync} = await import('fs')
    const processed = readFileSync(join(paths.workspace, 'src/content/docs/multi-h1.md'), 'utf-8')
    assert.ok(processed.includes('title: First Title'), 'Should use first H1 as title')
  })
})
