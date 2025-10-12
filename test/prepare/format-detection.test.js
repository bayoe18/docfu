/**
 * CLI tests for format detection and conversion
 * Tests MD → MDX/MDOC conversion based on syntax detection
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readFile} from 'fs/promises'
import {join} from 'path'
import {runCLI, getTestPaths, createFixtures, cleanupTestFile} from '../helpers.js'

describe('Format Detection', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should keep plain markdown files as .md', async () => {
    const paths = getTestPaths('plain-md', import.meta.url)
    await createFixtures(paths, 'format-detection', ['docfu.yml', 'plain-markdown.md'])

    const {exitCode, stdout, stderr} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(
      existsSync(join(paths.workspace, 'src/content/docs/plain-markdown.md')),
      'Plain markdown should stay as .md'
    )
    assert.ok(!existsSync(join(paths.workspace, 'src/content/docs/plain-markdown.mdx')), 'Should not become .mdx')
    assert.ok(!existsSync(join(paths.workspace, 'src/content/docs/plain-markdown.mdoc')), 'Should not become .mdoc')

    const content = await readFile(join(paths.workspace, 'src/content/docs/plain-markdown.md'), 'utf-8')
    // Note: Title extraction and H1 removal are done by the current processing pipeline
    // Files may preserve their original H1 headers
    assert.ok(content.includes('## Section'), 'Should preserve other content')
  })

  it('should convert files with JSX components to .mdx', async () => {
    const paths = getTestPaths('jsx-to-mdx', import.meta.url)
    await createFixtures(paths, 'format-detection', ['with-jsx-components.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/with-jsx-components.mdx')), 'Should become .mdx')
    assert.ok(
      !existsSync(join(paths.workspace, 'src/content/docs/with-jsx-components.md')),
      'Original .md should not exist'
    )

    const content = await readFile(join(paths.workspace, 'src/content/docs/with-jsx-components.mdx'), 'utf-8')
    assert.ok(content.includes('import { Badge, Card } from'), 'Should auto-import components')
    assert.ok(content.includes('<Card title="Test Card">'), 'Should preserve JSX component')
    assert.ok(content.includes('<Badge variant="success">'), 'Should preserve Badge component')
  })

  it('should convert files with Markdoc syntax to .mdoc', async () => {
    const paths = getTestPaths('markdoc-to-mdoc', import.meta.url)
    await createFixtures(paths, 'format-detection', ['with-markdoc-tags.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/with-markdoc-tags.mdoc')), 'Should become .mdoc')
    assert.ok(
      !existsSync(join(paths.workspace, 'src/content/docs/with-markdoc-tags.md')),
      'Original .md should not exist'
    )

    const content = await readFile(join(paths.workspace, 'src/content/docs/with-markdoc-tags.mdoc'), 'utf-8')
    assert.ok(content.includes('{% badge text="New" /%}'), 'Should preserve markdoc badges')
    assert.ok(content.includes('{% aside type="note" %}'), 'Should preserve markdoc asides')
  })

  it('should detect heading badges and convert to .mdoc', async () => {
    const paths = getTestPaths('heading-badges', import.meta.url)
    await createFixtures(paths, 'format-detection', ['docfu.yml', 'with-heading-badges.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/with-heading-badges.mdoc')), 'Should become .mdoc')

    const content = await readFile(join(paths.workspace, 'src/content/docs/with-heading-badges.mdoc'), 'utf-8')
    // Heading badges are converted to Markdoc badge tags
    assert.ok(content.includes('{% badge text="Beta" /%}'), 'Should convert H2 badge')
    assert.ok(content.includes(':badge[text]'), 'Should preserve inline badges')
  })

  it('should handle GitHub alerts correctly', async () => {
    const paths = getTestPaths('github-alerts', import.meta.url)
    await createFixtures(paths, 'format-detection', ['with-github-alerts.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(
      existsSync(join(paths.workspace, 'src/content/docs/with-github-alerts.md')),
      'GitHub alerts alone should stay as .md'
    )

    const content = await readFile(join(paths.workspace, 'src/content/docs/with-github-alerts.md'), 'utf-8')
    assert.ok(content.includes('> [!NOTE]'), 'Should preserve GitHub alert syntax in .md')
    assert.ok(!content.includes('{% aside'), 'Should not convert to markdoc aside in .md')
  })

  it('should convert GitHub alerts in files with badges', async () => {
    const paths = getTestPaths('badges-and-alerts', import.meta.url)
    await createFixtures(paths, 'format-detection', ['badges-and-alerts.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/badges-and-alerts.mdoc')), 'Should become .mdoc')

    const content = await readFile(join(paths.workspace, 'src/content/docs/badges-and-alerts.mdoc'), 'utf-8')
    assert.ok(content.includes('{% aside type="note" %}'), 'Should convert GitHub alerts to markdoc in .mdoc')
    assert.ok(content.includes('This is a note alert'), 'Should preserve alert content')
  })

  it('should auto-import multiple Starlight components', async () => {
    const paths = getTestPaths('multiple-components', import.meta.url)
    await createFixtures(paths, 'format-detection', ['multiple-components.md'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/multiple-components.mdx')), 'Should become .mdx')

    const content = await readFile(join(paths.workspace, 'src/content/docs/multiple-components.mdx'), 'utf-8')
    assert.ok(
      content.includes('import { Aside, Badge, Steps } from'),
      'Should import all used components alphabetically'
    )
    assert.ok(content.includes('<Badge variant="success">'), 'Should preserve Badge component')
    assert.ok(content.includes('<Aside type="tip">'), 'Should preserve Aside component')
    assert.ok(content.includes('<Steps>'), 'Should preserve Steps component')
  })

  it('should preserve existing .mdx files', async () => {
    const paths = getTestPaths('existing-mdx', import.meta.url)
    await createFixtures(paths, 'format-detection', ['existing.mdx'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/existing.mdx')), 'Should preserve .mdx extension')

    const content = await readFile(join(paths.workspace, 'src/content/docs/existing.mdx'), 'utf-8')
    assert.ok(content.includes('import CustomComponent from'), 'Should preserve existing imports')
    assert.ok(content.includes('<CustomComponent />'), 'Should preserve custom component')
  })

  it('should preserve existing .mdoc files', async () => {
    const paths = getTestPaths('existing-mdoc', import.meta.url)
    await createFixtures(paths, 'format-detection', ['existing.mdoc'])

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/existing.mdoc')), 'Should preserve .mdoc extension')

    const content = await readFile(join(paths.workspace, 'src/content/docs/existing.mdoc'), 'utf-8')
    assert.ok(content.includes('{% badge text="Markdoc" /%}'), 'Should preserve markdoc tags')
    assert.ok(content.includes('{% aside type="note" %}'), 'Should preserve markdoc asides')
  })
})
