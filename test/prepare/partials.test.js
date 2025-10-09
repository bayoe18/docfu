/**
 * CLI tests for partials functionality
 * Tests Markdoc and MDX partial content reuse
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readFile} from 'fs/promises'
import {join} from 'path'
import {runCLI, getTestPaths, createFixtures, createInlineFixtures, cleanupTestFile} from '../helpers.js'

// Clean up once before all tests in this file
beforeAll(() => cleanupTestFile(import.meta.url))

describe('Markdoc Partials', () => {
  it('should convert files with partial tags to .mdoc', async () => {
    const paths = getTestPaths('partial-conversion', import.meta.url)
    await createFixtures(paths, 'partials', ['docfu.yml', 'with-partial.md', '_partials/note.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'with-partial.mdoc')), 'File with partial should become .mdoc')
    assert.ok(!existsSync(join(paths.workspace, 'with-partial.md')), 'Original .md should not exist')

    const content = await readFile(join(paths.workspace, 'with-partial.mdoc'), 'utf-8')
    assert.ok(content.includes('{% partial'), 'Should preserve partial tags')
    assert.ok(content.includes('file="_partials/note"'), 'Should preserve extensionless partial reference')
  })

  it('should convert partials with markdoc syntax and update references', async () => {
    const paths = getTestPaths('partial-markdoc', import.meta.url)
    await createFixtures(paths, 'partials', ['docfu.yml', 'with-mdoc-partial.md', '_partials/markdoc-partial.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')

    assert.ok(existsSync(join(paths.workspace, 'with-mdoc-partial.mdoc')), 'Main file should be .mdoc')

    assert.ok(
      existsSync(join(paths.workspace, '_partials/markdoc-partial.mdoc')),
      'Partial with markdoc should be .mdoc'
    )
    assert.ok(
      !existsSync(join(paths.workspace, '_partials/markdoc-partial.md')),
      'Original partial .md should not exist'
    )

    const mainContent = await readFile(join(paths.workspace, 'with-mdoc-partial.mdoc'), 'utf-8')
    assert.ok(mainContent.includes('file="_partials/markdoc-partial.mdoc"'), 'Reference should be updated to .mdoc')
    assert.ok(!mainContent.includes('file="_partials/markdoc-partial.md"'), 'Should not contain old .md reference')

    const partialContent = await readFile(join(paths.workspace, '_partials/markdoc-partial.mdoc'), 'utf-8')
    assert.ok(partialContent.includes('{% badge'), 'Partial should contain markdoc syntax')
  })

  it('should preserve partials directory structure', async () => {
    const paths = getTestPaths('partial-structure', import.meta.url)
    await createFixtures(paths, 'partials', [
      'docfu.yml',
      'with-partial.md',
      '_partials/note.md',
      '_partials/markdoc-partial.md',
    ])

    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, '_partials')), 'Partials directory should exist')
    assert.ok(existsSync(join(paths.workspace, '_partials/note.md')), 'Plain partial should exist')
    assert.ok(existsSync(join(paths.workspace, '_partials/markdoc-partial.mdoc')), 'Markdoc partial should exist')
  })
})

describe('MDX Partials', () => {
  it('should support importing and rendering MDX files as partials', async () => {
    const paths = getTestPaths('mdx-partials', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      '_partials/reusable-content.mdx': `---
title: Reusable Content
---

This is reusable content from a partial MDX file.

It can include **markdown** formatting and even components!`,
      '_partials/license.mdx': `## License

MIT License - Feel free to use this content.`,
      'guide.mdx': `---
title: Guide
---

import ReusableContent from './_partials/reusable-content.mdx'
import License from './_partials/license.mdx'

# Documentation Guide

Here's some shared content:

<ReusableContent />

And the license:

<License />`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    // Verify HTML output includes content from both partials
    const html = await readFile(join(paths.dist, 'guide/index.html'), 'utf-8')
    assert.ok(html.includes('This is reusable content from a partial MDX file'), 'Should render partial content')
    assert.ok(html.includes('markdown'), 'Should render markdown formatting from partial')
    assert.ok(html.includes('MIT License'), 'Should render license partial content')
    assert.ok(html.includes('Feel free to use this content'), 'Should render full partial text')
  })

  it('should support MDX partials with nested imports', async () => {
    const paths = getTestPaths('mdx-nested-partials', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      '_partials/footer.mdx': `Built with DocFu`,
      '_partials/section.mdx': `import Footer from './footer.mdx'

## Section Content

This is a reusable section.

<Footer />`,
      'page.mdx': `---
title: Page
---

import Section from './_partials/section.mdx'

# My Page

<Section />`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const html = await readFile(join(paths.dist, 'page/index.html'), 'utf-8')
    assert.ok(html.includes('This is a reusable section'), 'Should render section partial')
    assert.ok(html.includes('Built with DocFu'), 'Should render nested footer partial')
  })
})
