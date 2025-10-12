/**
 * CLI tests for exclude patterns functionality
 * Tests file and directory exclusion via docfu.yml exclude config
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readdir} from 'fs/promises'
import {join} from 'path'
import {runCLI, getTestPaths, createFixtures, cleanupTestFile} from '../helpers.js'

describe('Exclude Patterns', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should exclude files matching directory patterns', async () => {
    const paths = getTestPaths('exclude-dirs', import.meta.url)
    await createFixtures(paths, 'exclude-patterns', [
      'docfu.yml',
      'index.md',
      'drafts/draft1.md',
      'archive/old.md',
      'internal/secret.md',
    ])

    const {exitCode, stdout} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(stdout.includes('✗ Excluded:'), 'Should show excluded files in output')

    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/index.md')), 'index.md should be included')

    assert.ok(!existsSync(join(paths.workspace, 'drafts')), 'drafts directory should not exist')
    assert.ok(!existsSync(join(paths.workspace, 'archive')), 'archive directory should not exist')
    assert.ok(!existsSync(join(paths.workspace, 'internal')), 'internal directory should not exist')
  })

  it('should exclude files matching specific file patterns', async () => {
    const paths = getTestPaths('exclude-files', import.meta.url)
    await createFixtures(paths, 'exclude-patterns', ['docfu.yml', 'index.md', 'regular.md', 'specific-file.md'])

    const {exitCode, stdout} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')

    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/index.md')), 'index.md should be included')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/regular.md')), 'regular.md should be included')

    assert.ok(
      !existsSync(join(paths.workspace, 'src/content/docs/specific-file.md')),
      'specific-file.md should be excluded'
    )
    assert.ok(stdout.includes('specific-file.md'), 'Should show specific-file.md as excluded')
  })

  it('should exclude files matching glob patterns with suffix', async () => {
    const paths = getTestPaths('exclude-glob-suffix', import.meta.url)
    await createFixtures(paths, 'exclude-patterns', ['docfu.yml', 'index.md', 'regular.md', 'feature-draft.md'])

    const {exitCode, stdout} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')

    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/index.md')), 'index.md should be included')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/regular.md')), 'regular.md should be included')

    assert.ok(
      !existsSync(join(paths.workspace, 'src/content/docs/feature-draft.md')),
      'feature-draft.md should be excluded'
    )
    assert.ok(stdout.includes('feature-draft.md'), 'Should show feature-draft.md as excluded')
  })

  it('should exclude files matching glob patterns with extension', async () => {
    const paths = getTestPaths('exclude-glob-ext', import.meta.url)
    await createFixtures(paths, 'exclude-patterns', ['docfu.yml', 'index.md', 'regular.md', 'backup.tmp.md'])

    const {exitCode, stdout} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')

    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/index.md')), 'index.md should be included')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/regular.md')), 'regular.md should be included')

    assert.ok(!existsSync(join(paths.workspace, 'backup.tmp.md')), 'backup.tmp.md should be excluded')
    assert.ok(stdout.includes('backup.tmp.md'), 'Should show backup.tmp.md as excluded')
  })

  it('should exclude directories matching glob patterns with prefix', async () => {
    const paths = getTestPaths('exclude-glob-prefix', import.meta.url)
    await createFixtures(paths, 'exclude-patterns', ['docfu.yml', 'index.md', 'temp-dir/file.md'])

    const {exitCode, stdout} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')

    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/index.md')), 'index.md should be included')

    assert.ok(!existsSync(join(paths.workspace, 'temp-dir')), 'temp-dir should be excluded')
    assert.ok(stdout.includes('temp-dir'), 'Should show temp-dir as excluded')
  })

  it('should list excluded patterns in processing output', async () => {
    const paths = getTestPaths('exclude-list', import.meta.url)
    await createFixtures(paths, 'exclude-patterns', ['docfu.yml', 'index.md'])

    const {exitCode, stdout} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')

    assert.ok(stdout.includes('Exclude patterns:'), 'Should show exclude patterns header')
    assert.ok(stdout.includes('drafts'), 'Should list drafts pattern')
    assert.ok(stdout.includes('archive'), 'Should list archive pattern')
    assert.ok(stdout.includes('*-draft.md'), 'Should list *-draft.md pattern')
    assert.ok(stdout.includes('*.tmp.md'), 'Should list *.tmp.md pattern')
  })

  it('should handle mixed included and excluded files correctly', async () => {
    const paths = getTestPaths('exclude-mixed', import.meta.url)
    await createFixtures(paths, 'exclude-patterns', [
      'docfu.yml',
      'index.md',
      'regular.md',
      'specific-file.md',
      'feature-draft.md',
      'backup.tmp.md',
      'drafts/draft1.md',
      'archive/old.md',
    ])

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')

    const docs = join(paths.workspace, 'src/content/docs')
    const files = await readdir(docs, {recursive: true})
    const mdFiles = files.filter(f => f.endsWith('.md'))

    assert.ok(mdFiles.includes('index.md'), 'Should include index.md')
    assert.ok(mdFiles.includes('regular.md'), 'Should include regular.md')
    assert.strictEqual(mdFiles.length, 2, 'Should only have 2 markdown files')
  })
})
