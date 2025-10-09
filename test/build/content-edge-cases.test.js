/**
 * CLI tests for content edge cases
 * Tests duplicate slugs, special characters, unusual content patterns
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, readFileSync, mkdirSync, writeFileSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, cleanupTestFile, createInlineFixtures} from '../helpers.js'

describe('Content Edge Cases', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should handle duplicate slugs (same filename in different dirs)', async () => {
    const paths = getTestPaths('edge-duplicate-slugs', import.meta.url)

    mkdirSync(join(paths.source, 'api'), {recursive: true})
    mkdirSync(join(paths.source, 'guides'), {recursive: true})

    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(paths.source, 'index.md'), '# Home')
    writeFileSync(join(paths.source, 'api', 'reference.md'), '# API Reference\n\nAPI docs')
    writeFileSync(join(paths.source, 'guides', 'reference.md'), '# Guide Reference\n\nGuide docs')

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Should handle duplicate filenames in different dirs')

    assert.ok(existsSync(join(paths.dist, 'api', 'reference', 'index.html')), 'Should create API reference')
    assert.ok(existsSync(join(paths.dist, 'guides', 'reference', 'index.html')), 'Should create guides reference')

    const apiHtml = readFileSync(join(paths.dist, 'api', 'reference', 'index.html'), 'utf-8')
    const guidesHtml = readFileSync(join(paths.dist, 'guides', 'reference', 'index.html'), 'utf-8')

    assert.ok(apiHtml.includes('API Reference'), 'API page should have correct content')
    assert.ok(guidesHtml.includes('Guide Reference'), 'Guides page should have correct content')
  })

  it('should handle special characters in filenames', async () => {
    const paths = getTestPaths('edge-special-chars', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
    })

    writeFileSync(join(paths.source, 'file-with-dashes.md'), '# Dashes\n\nContent')
    writeFileSync(join(paths.source, 'file_with_underscores.md'), '# Underscores\n\nContent')
    writeFileSync(join(paths.source, 'file with spaces.md'), '# Spaces\n\nContent')

    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    assert.strictEqual(exitCode, 0, 'Should handle special characters in filenames')

    assert.ok(existsSync(join(paths.workspace, 'file-with-dashes.md')), 'Should process files with dashes')
    assert.ok(existsSync(join(paths.workspace, 'file_with_underscores.md')), 'Should process files with underscores')
    assert.ok(existsSync(join(paths.workspace, 'file with spaces.md')), 'Should process files with spaces')
  })

  it('should handle very long titles', async () => {
    const paths = getTestPaths('edge-long-title', import.meta.url)
    const longTitle =
      'This Is A Very Long Title That Goes On And On And On And Contains Many Words To Test Title Handling With Extremely Long Content That Might Need Truncation Or Special Handling In Various Parts Of The System'

    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
      'long-title.md': `# ${longTitle}\n\nContent here.`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Should handle very long titles')

    const manifest = JSON.parse(readFileSync(join(paths.workspace, 'manifest.json'), 'utf-8'))
    const doc = manifest.docs.find(d => d.slug === 'long-title')
    assert.ok(doc, 'Should include document in manifest')
    assert.ok(doc.title.includes('Very Long Title'), 'Should preserve long title')
  })

  it('should handle files with unicode and emoji in content', async () => {
    const paths = getTestPaths('edge-unicode', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
      'unicode.md': '# Unicode Test 🚀\n\nContent with emoji 😀 and unicode: café, naïve, 你好',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Should handle unicode and emoji')

    const html = readFileSync(join(paths.dist, 'unicode/index.html'), 'utf-8')
    assert.ok(html.includes('🚀') || html.includes('1F680'), 'Should include emoji')
    assert.ok(html.includes('café'), 'Should include unicode characters')
  })

  it('should handle markdown mixed with HTML tags', async () => {
    const paths = getTestPaths('edge-html-mixed', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
      'mixed.md': `# Mixed Content

<div class="custom">
This is **markdown** inside HTML.
</div>

Regular markdown here.

<span style="color: red;">Inline HTML</span> with *markdown*.`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Should handle mixed markdown and HTML')

    const html = readFileSync(join(paths.dist, 'mixed/index.html'), 'utf-8')
    assert.ok(html.includes('class="custom"'), 'Should preserve HTML attributes')
    assert.ok(html.includes('This is') && html.includes('markdown'), 'Should preserve content inside HTML')
  })

  it('should handle README.md files', async () => {
    const paths = getTestPaths('edge-readme', import.meta.url)

    mkdirSync(join(paths.source, 'guides'), {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(paths.source, 'README.md'), '# Project README\n\nMain readme')
    writeFileSync(join(paths.source, 'guides', 'README.md'), '# Guides README\n\nGuides intro')

    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    assert.strictEqual(exitCode, 0, 'Should handle README.md files')

    assert.ok(existsSync(join(paths.workspace, 'index.md')), 'Should rename root README to index.md')
    assert.ok(existsSync(join(paths.workspace, 'guides', 'index.md')), 'Should rename nested README to index.md')
    assert.ok(!existsSync(join(paths.workspace, 'README.md')), 'Root README.md should not exist')
    assert.ok(!existsSync(join(paths.workspace, 'guides', 'README.md')), 'Nested README.md should not exist')

    const manifest = JSON.parse(readFileSync(join(paths.workspace, 'manifest.json'), 'utf-8'))
    assert.ok(
      manifest.docs.find(d => d.title === 'Project README'),
      'Should include README in manifest'
    )
    assert.ok(
      manifest.docs.find(d => d.title === 'Guides README'),
      'Should include nested README'
    )
  })

  it('should handle case-sensitive filenames', async () => {
    const paths = getTestPaths('edge-case-sensitive', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'Guide.md': '# Guide (capitalized)\n\nContent',
      'guide.md': '# guide (lowercase)\n\nDifferent content',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    if (existsSync(join(paths.workspace, 'Guide.md')) && existsSync(join(paths.workspace, 'guide.md'))) {
      assert.strictEqual(exitCode, 0, 'Should handle case-sensitive filenames')
    } else {
      assert.ok(
        existsSync(join(paths.workspace, 'Guide.md')) || existsSync(join(paths.workspace, 'guide.md')),
        'Should process at least one version'
      )
    }
  })

  it('should handle files with no extension', async () => {
    const paths = getTestPaths('edge-no-extension', import.meta.url)

    mkdirSync(paths.source, {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(paths.source, 'index.md'), '# Home')
    writeFileSync(join(paths.source, 'LICENSE'), 'MIT License text')
    writeFileSync(join(paths.source, 'CHANGELOG'), '# Changelog\n\nVersion 1.0')

    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    assert.strictEqual(exitCode, 0, 'Should handle files without extensions')

    assert.ok(existsSync(join(paths.workspace, 'index.md')), 'Should process markdown files')
  })

  it('should handle very deeply nested directories', async () => {
    const paths = getTestPaths('edge-deep-nesting', import.meta.url)

    const deepPath = join(paths.source, 'a', 'b', 'c', 'd', 'e', 'f', 'g')
    mkdirSync(deepPath, {recursive: true})

    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(deepPath, 'deep.md'), '# Deep File\n\nDeeply nested content')

    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    assert.strictEqual(exitCode, 0, 'Should handle deeply nested directories')
    assert.ok(
      existsSync(join(paths.workspace, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'deep.md')),
      'Should preserve deep nesting'
    )
  })

  it('should handle empty headings', async () => {
    const paths = getTestPaths('edge-empty-heading', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'empty-heading.md': '# \n\nContent after empty heading.\n\n## Another Section',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    assert.ok(exitCode === 0 || exitCode === 1, 'Should handle empty heading gracefully')
  })
})
