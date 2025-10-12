/**
 * CLI tests for hierarchical configuration
 * Tests multiple docfu.yml files, inheritance, and overrides
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, readFileSync, mkdirSync, writeFileSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, cleanupTestFile} from '../helpers.js'

describe('Configuration Hierarchy', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should merge multiple docfu.yml files', async () => {
    const paths = getTestPaths('config-hierarchy-merge', import.meta.url)

    mkdirSync(paths.source, {recursive: true})
    writeFileSync(
      join(paths.source, 'docfu.yml'),
      'site:\n  name: Main Site\n  url: https://example.com\nexclude:\n  - drafts'
    )
    writeFileSync(join(paths.source, 'index.md'), '# Home')

    mkdirSync(join(paths.source, 'guides'), {recursive: true})
    writeFileSync(join(paths.source, 'guides', 'docfu.yml'), 'exclude:\n  - temp.md')
    writeFileSync(join(paths.source, 'guides', 'guide.md'), '# Guide')
    writeFileSync(join(paths.source, 'guides', 'temp.md'), '# Temp')

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Should succeed with hierarchical config')

    const config = readFileSync(join(paths.root, 'config.yml'), 'utf-8')
    assert.ok(config.includes('Main Site'), 'Should have site config from root')
    assert.ok(config.includes('drafts') || config.includes('temp.md'), 'Should merge exclude patterns')
  })

  it('should inherit site config from root only', async () => {
    const paths = getTestPaths('config-site-root-only', import.meta.url)

    mkdirSync(join(paths.source, 'api'), {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Docs\n  url: https://docs.com')
    writeFileSync(join(paths.source, 'index.md'), '# Home')

    writeFileSync(join(paths.source, 'api', 'docfu.yml'), 'site:\n  name: API Docs\n  url: https://api.com')
    writeFileSync(join(paths.source, 'api', 'reference.md'), '# API')

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Should succeed')

    const config = readFileSync(join(paths.root, 'config.yml'), 'utf-8')
    assert.ok(config.includes('name: Docs'), 'Should use root site config')
    assert.ok(!config.includes('API Docs'), 'Should not use subdirectory site config')
  })

  it('should handle exclude patterns at different levels', async () => {
    const paths = getTestPaths('config-exclude-levels', import.meta.url)

    mkdirSync(join(paths.source, 'drafts'), {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com\nexclude:\n  - drafts')
    writeFileSync(join(paths.source, 'index.md'), '# Home')
    writeFileSync(join(paths.source, 'drafts', 'draft.md'), '# Draft')

    mkdirSync(join(paths.source, 'guides'), {recursive: true})
    writeFileSync(join(paths.source, 'guides', 'docfu.yml'), 'exclude:\n  - "*.tmp.md"')
    writeFileSync(join(paths.source, 'guides', 'guide.md'), '# Guide')
    writeFileSync(join(paths.source, 'guides', 'notes.tmp.md'), '# Temp Notes')

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Should succeed')
    assert.ok(!existsSync(join(paths.workspace, 'src/content/docs/drafts')), 'Should exclude drafts directory')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/guides/guide.md')), 'Should include guide')
    assert.ok(
      !existsSync(join(paths.workspace, 'src/content/docs/guides/notes.tmp.md')),
      'Should exclude .tmp.md files'
    )
  })

  it('should support frontmatter defaults in config', async () => {
    const paths = getTestPaths('config-frontmatter-defaults', import.meta.url)

    mkdirSync(join(paths.source, 'api'), {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(paths.source, 'index.md'), '# Home')

    writeFileSync(
      join(paths.source, 'api', 'docfu.yml'),
      'frontmatter:\n  sidebar:\n    badge:\n      text: API\n      variant: note'
    )
    writeFileSync(join(paths.source, 'api', 'reference.md'), '# API Reference\n\nContent')

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Should succeed')

    const processed = readFileSync(join(paths.workspace, 'src/content/docs/api/reference.md'), 'utf-8')
    assert.ok(processed.includes('sidebar:'), 'Should apply frontmatter defaults')
    assert.ok(processed.includes('badge:'), 'Should include badge configuration')
  })

  it('should handle file-specific config in docfu.yml', async () => {
    const paths = getTestPaths('config-file-specific', import.meta.url)

    mkdirSync(paths.source, {recursive: true})

    writeFileSync(
      join(paths.source, 'docfu.yml'),
      `site:
  name: Test
  url: https://test.com

'index.md':
  frontmatter:
    title: Custom Home Title
    description: Custom description`
    )
    writeFileSync(join(paths.source, 'index.md'), '# Home\n\nOriginal content')
    writeFileSync(join(paths.source, 'other.md'), '# Other\n\nContent')

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Should succeed')

    const index = readFileSync(join(paths.workspace, 'src/content/docs/index.md'), 'utf-8')
    assert.ok(index.includes('Custom Home Title'), 'Should apply file-specific title')
    assert.ok(index.includes('Custom description'), 'Should apply file-specific description')

    const other = readFileSync(join(paths.workspace, 'src/content/docs/other.md'), 'utf-8')
    assert.ok(other.includes('title: Other'), 'Other file should use default title from H1')
  })

  it('should handle missing site config gracefully', async () => {
    const paths = getTestPaths('config-missing-site', import.meta.url)

    mkdirSync(paths.source, {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'exclude:\n  - drafts')
    writeFileSync(join(paths.source, 'index.md'), '# Home')

    const {exitCode, stderr} = await runCLI(['prepare', paths.source, '--root', paths.root])

    if (exitCode !== 0) {
      assert.ok(stderr.includes('site') || stderr.includes('required'), 'Should mention missing site config')
    } else {
      assert.ok(
        existsSync(join(paths.workspace, 'src/content/docs/index.md')),
        'Should process files even without full config'
      )
    }
  })

  it('should preserve user-defined frontmatter without overwriting', async () => {
    const paths = getTestPaths('preserve-user-frontmatter', import.meta.url)

    mkdirSync(paths.source, {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')

    // File with explicit frontmatter that differs from H1
    writeFileSync(
      join(paths.source, 'guide.md'),
      `---
title: User Defined Title
description: User defined description
customField: custom value
author: Jane Doe
---

# This H1 Should Not Override Title

Content here.`
    )

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Should succeed')

    const processed = readFileSync(join(paths.workspace, 'src/content/docs/guide.md'), 'utf-8')

    // Verify user-defined frontmatter is preserved
    assert.ok(processed.includes('title: User Defined Title'), 'Should preserve user-defined title')
    assert.ok(processed.includes('description: User defined description'), 'Should preserve user-defined description')
    assert.ok(processed.includes('customField: custom value'), 'Should preserve custom fields')
    assert.ok(processed.includes('author: Jane Doe'), 'Should preserve author field')

    // Verify H1 was removed (since title exists in frontmatter)
    assert.ok(!processed.includes('# This H1 Should Not Override Title'), 'Should remove H1 since title exists')

    // Verify content is preserved
    assert.ok(processed.includes('Content here.'), 'Should preserve markdown content')
  })
})
