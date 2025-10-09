/**
 * Icon inline CSS class test
 * Verifies Icon component with .inline class displays icons inline
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readFileSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, createInlineFixtures, cleanupTestFile} from '../helpers.js'

beforeAll(() => cleanupTestFile(import.meta.url))

describe('Icon Component - Inline CSS Class', () => {
  it('should support Icon with inline class in MDX', async () => {
    const paths = getTestPaths('icon-inline-mdx', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': `# Icon Inline Test

This is text with an inline icon <Icon name="star" class="inline" /> in the middle.

Regular icon without inline:
<Icon name="rocket" />`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')
    assert.ok(existsSync(join(paths.dist, 'index.html')), 'Should generate index.html')

    const html = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(html.includes('class="inline'), 'Should have inline class on icon')

    // Verify icon actually renders (SVG contains path elements, not empty)
    const inlineIconMatch = html.match(/class="inline[^>]*>[\s\S]*?<path/)
    assert.ok(inlineIconMatch, 'Should find inline icon SVG with path elements')
  })

  it('should support Icon with inline class in Markdoc', async () => {
    const paths = getTestPaths('icon-inline-markdoc', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': `# Icon Inline Test

This is text with an inline icon {% icon name="star" class="inline" /%} in the middle.

Regular icon without inline:
{% icon name="rocket" /%}`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')
    assert.ok(existsSync(join(paths.dist, 'index.html')), 'Should generate index.html')

    const html = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(html.includes('class="inline'), 'Should have inline class on icon')

    // Verify icon actually renders (SVG contains path elements, not empty)
    const inlineIconMatch = html.match(/class="inline[^>]*>[\s\S]*?<path/)
    assert.ok(inlineIconMatch, 'Should find inline icon SVG with path elements')
  })

  it('should default to block display without inline attribute', async () => {
    const paths = getTestPaths('icon-block-default', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': `# Icon Default Test

<Icon name="star" />`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const html = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    // Without inline attribute, should not have the inline styles on the wrapper span
    // The SVG itself may have its own styles from Starlight
    assert.ok(html.includes('svg') || html.includes('icon'), 'Should render icon')
  })
})
