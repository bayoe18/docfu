/**
 * Mermaid in MDX test
 * Verifies how Mermaid diagrams are handled in .mdx files
 *
 * NOTE: astro-mermaid preprocessor handles both .md and .mdx files
 * Standard mermaid code blocks (```mermaid) work in all formats
 * Fence component also works for explicit control (now auto-imported)
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readFileSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, createInlineFixtures, cleanupTestFile} from '../helpers.js'

beforeAll(() => cleanupTestFile(import.meta.url))

describe('Mermaid in MDX', () => {
  it('should handle standard mermaid code blocks in .mdx files', async () => {
    // astro-mermaid preprocesses both .md and .mdx files
    const paths = getTestPaths('mermaid-mdx-standard', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'diagram.mdx': `---
title: Mermaid Test
---

# Mermaid in MDX

Standard code block syntax:

\`\`\`mermaid
graph TD
  A[Start] --> B[End]
\`\`\`
`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')
    assert.ok(existsSync(join(paths.dist, 'diagram/index.html')), 'Should generate index.html')

    const html = readFileSync(join(paths.dist, 'diagram/index.html'), 'utf-8')

    // astro-mermaid preprocesses .mdx files, converting code blocks to <pre class="mermaid">
    assert.ok(html.includes('class="mermaid"'), 'Should have preprocessed mermaid element')
    assert.ok(html.includes('graph TD'), 'Should include diagram code')
  })

  it('should handle explicit Fence component in .mdx files', async () => {
    const paths = getTestPaths('mermaid-mdx-fence', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'diagram.mdx': `---
title: Fence Component Test
---

# Mermaid with Fence Component

Using Fence component explicitly:

<Fence code={\`graph TD
  A[Start] --> B[End]\`} lang="mermaid" />
`,
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')
    assert.ok(existsSync(join(paths.dist, 'diagram/index.html')), 'Should generate index.html')

    const html = readFileSync(join(paths.dist, 'diagram/index.html'), 'utf-8')
    const mermaidSection = html.match(/<article>[\s\S]*?<\/article>/)?.[0] || ''

    // With auto-import fix, Fence component should work in .mdx files
    assert.ok(html.includes('class="mermaid"'), 'Should have mermaid pre element')
    assert.ok(html.includes('graph TD'), 'Should include diagram code')
  })
})
