/**
 * CLI tests for syntax conversion
 * Tests GitHub alerts and badge syntax transformations
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readFile} from 'fs/promises'
import {join} from 'path'
import {runCLI, getTestPaths, createFixtures, cleanupTestFile} from '../helpers.js'

describe('Syntax Conversion', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should preserve GitHub alerts in plain markdown', async () => {
    const paths = getTestPaths('github-alerts-preserve', import.meta.url)
    await createFixtures(paths, 'syntax-conversion', ['docfu.yml', 'github-alerts.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/github-alerts.md')), 'Should stay as .md')

    const content = await readFile(join(paths.workspace, 'src/content/docs/github-alerts.md'), 'utf-8')
    assert.ok(content.includes('> [!NOTE]'), 'Should preserve GitHub alert syntax')
    assert.ok(content.includes('> [!TIP]'), 'Should preserve TIP alert')
    assert.ok(content.includes('> [!WARNING]'), 'Should preserve WARNING alert')
    assert.ok(!content.includes('{% aside'), 'Should not convert to markdoc aside in .md')
  })

  it('should convert GitHub alerts to markdoc in .mdoc files', async () => {
    const paths = getTestPaths('github-alerts-convert', import.meta.url)
    await createFixtures(paths, 'syntax-conversion', ['docfu.yml', 'alerts-with-badges.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/alerts-with-badges.mdoc')), 'Should become .mdoc')

    const content = await readFile(join(paths.workspace, 'src/content/docs/alerts-with-badges.mdoc'), 'utf-8')
    assert.ok(content.includes('{% aside type="note" %}'), 'Should convert GitHub alerts to markdoc asides')
    assert.ok(content.includes('Combined with badges'), 'Should preserve alert content')
    assert.ok(!content.includes('> [!NOTE]'), 'Should not have GitHub alert syntax')
  })

  it('should convert heading badges to markdoc tags', async () => {
    const paths = getTestPaths('heading-badges-convert', import.meta.url)
    await createFixtures(paths, 'syntax-conversion', ['docfu.yml', 'heading-badges.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/heading-badges.mdoc')), 'Should become .mdoc')

    const content = await readFile(join(paths.workspace, 'src/content/docs/heading-badges.mdoc'), 'utf-8')
    assert.ok(content.includes('{% badge'), 'Should have markdoc badge tags')
    assert.ok(content.includes(':badge[text]'), 'Should preserve inline badge syntax')
  })
})
