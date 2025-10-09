/**
 * CLI tests for common markdown features
 * Tests code blocks, tables, lists, links, blockquotes
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, readFileSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, cleanupTestFile, createInlineFixtures} from '../helpers.js'

describe('Markdown Features', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should handle code blocks with syntax highlighting', async () => {
    const paths = getTestPaths('md-code-blocks', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'code.md': `# Code Examples

\`\`\`javascript
const hello = 'world'
console.log(hello)
\`\`\`

\`\`\`python
def hello():
    print("world")
\`\`\`

\`\`\`bash
echo "hello world"
\`\`\``,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with code blocks')

    const html = readFileSync(join(paths.dist, 'code/index.html'), 'utf-8')
    assert.ok(html.includes('const hello'), 'Should include JavaScript code')
    assert.ok(html.includes('def hello'), 'Should include Python code')
    assert.ok(html.includes('echo'), 'Should include Bash code')
    assert.ok(html.includes('<code'), 'Should render code blocks')
  })

  it('should handle tables', async () => {
    const paths = getTestPaths('md-tables', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'table.md': `# Tables

| Feature | Status |
|---------|--------|
| Tables  | ✓      |
| Lists   | ✓      |

More content here.`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with tables')

    const html = readFileSync(join(paths.dist, 'table/index.html'), 'utf-8')
    assert.ok(html.includes('<table'), 'Should render table element')
    assert.ok(html.includes('<th'), 'Should render table headers')
    assert.ok(html.includes('Feature'), 'Should include table content')
    assert.ok(html.includes('Status'), 'Should include table headers')
  })

  it('should handle lists (ordered and unordered)', async () => {
    const paths = getTestPaths('md-lists', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'lists.md': `# Lists

Unordered list:
- Item 1
- Item 2
  - Nested item
  - Another nested
- Item 3

Ordered list:
1. First
2. Second
3. Third

Task list:
- [ ] Todo item
- [x] Completed item`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with lists')

    const html = readFileSync(join(paths.dist, 'lists/index.html'), 'utf-8')
    assert.ok(html.includes('<ul'), 'Should render unordered lists')
    assert.ok(html.includes('<ol'), 'Should render ordered lists')
    assert.ok(html.includes('<li'), 'Should render list items')
    assert.ok(html.includes('Item 1'), 'Should include list content')
  })

  it('should handle links between pages', async () => {
    const paths = getTestPaths('md-links', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': `# Home

[Go to guide](./guide.md)
[External link](https://example.com)`,
      'guide.md': '# Guide\n\n[Back to home](./index.md)',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with links')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(indexHtml.includes('<a'), 'Should render links')
    assert.ok(indexHtml.includes('guide') || indexHtml.includes('href'), 'Should have link to guide')

    const guideHtml = readFileSync(join(paths.dist, 'guide/index.html'), 'utf-8')
    assert.ok(guideHtml.includes('<a'), 'Should render links in guide')
  })

  it('should handle anchor links to headings', async () => {
    const paths = getTestPaths('md-anchors', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'anchors.md': `# Documentation

## Installation

Content about installation.

## Usage

Content about usage.

[Jump to Installation](#installation)`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with anchor links')

    const html = readFileSync(join(paths.dist, 'anchors/index.html'), 'utf-8')
    assert.ok(html.includes('id="installation"') || html.includes('id="Installation"'), 'Should have heading IDs')
    assert.ok(html.includes('id="usage"') || html.includes('id="Usage"'), 'Should have heading IDs for all headings')
    assert.ok(html.includes('#installation'), 'Should have anchor link')
  })

  it('should handle blockquotes', async () => {
    const paths = getTestPaths('md-blockquotes', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'quotes.md': `# Quotes

> This is a blockquote
> with multiple lines

Regular content.

> **Note:** Important information`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with blockquotes')

    const html = readFileSync(join(paths.dist, 'quotes/index.html'), 'utf-8')
    assert.ok(html.includes('<blockquote') || html.includes('aside'), 'Should render blockquotes')
    assert.ok(html.includes('This is a blockquote'), 'Should include blockquote content')
  })

  it('should handle inline code', async () => {
    const paths = getTestPaths('md-inline-code', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'inline.md': '# Code\n\nUse the `console.log()` function.\n\nThe variable `myVar` is important.',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with inline code')

    const html = readFileSync(join(paths.dist, 'inline/index.html'), 'utf-8')
    assert.ok(html.includes('<code'), 'Should render inline code tags')
    assert.ok(html.includes('console.log'), 'Should include inline code content')
  })

  it('should handle emphasis (bold, italic)', async () => {
    const paths = getTestPaths('md-emphasis', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'emphasis.md': `# Emphasis

This is **bold text** and this is *italic text*.

You can also use __bold__ and _italic_.

And ***bold italic*** text.`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with emphasis')

    const html = readFileSync(join(paths.dist, 'emphasis/index.html'), 'utf-8')
    assert.ok(html.includes('<strong') || html.includes('<b'), 'Should render bold')
    assert.ok(html.includes('<em') || html.includes('<i'), 'Should render italic')
    assert.ok(html.includes('bold text'), 'Should include emphasized content')
  })

  it('should handle horizontal rules', async () => {
    const paths = getTestPaths('md-hr', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'hr.md': '# Sections\n\nFirst section.\n\n---\n\nSecond section.\n\n***\n\nThird section.',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist])

    assert.strictEqual(exitCode, 0, 'Build should succeed with horizontal rules')

    const html = readFileSync(join(paths.dist, 'hr/index.html'), 'utf-8')
    assert.ok(html.includes('<hr'), 'Should render horizontal rules')
  })

  it('should handle images in markdown', async () => {
    const paths = getTestPaths('md-images', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'images.md': '# Images\n\n![Logo](./logo.png)\n\n![Alt text](https://example.com/image.jpg)',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    assert.strictEqual(exitCode, 0, 'Prepare should succeed with image references')

    const processed = readFileSync(join(paths.workspace, 'images.md'), 'utf-8')
    assert.ok(processed.includes('![Logo](./logo.png)'), 'Should preserve image syntax')
    assert.ok(processed.includes('![Alt text]'), 'Should preserve alt text')
  })
})
