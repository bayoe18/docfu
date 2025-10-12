/**
 * Tests for README → index renaming and link transformation
 * Validates zero-config README handling without breaking existing tools
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readFile} from 'fs/promises'
import {join} from 'path'
import {runCLI, getTestPaths, createInlineFixtures, cleanupTestFile} from '../helpers.js'

beforeAll(() => cleanupTestFile(import.meta.url))

describe('README Renaming', () => {
  it('should rename README.md to index.md when no index exists', async () => {
    const paths = getTestPaths('readme-to-index', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test',
      'README.md': '---\ntitle: Welcome\n---\n\n# Welcome\n\nThis is the README.',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/index.md')), 'README.md should become index.md')
    assert.ok(!existsSync(join(paths.workspace, 'src/content/docs/README.md')), 'README.md should not exist')

    const content = await readFile(join(paths.workspace, 'src/content/docs/index.md'), 'utf-8')
    assert.ok(content.includes('This is the README'), 'Content should be preserved')
  })

  it('should keep README.md when index.md exists', async () => {
    const paths = getTestPaths('readme-with-index', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test',
      'README.md': '---\ntitle: README\n---\n\n# README\n\nProject readme.',
      'index.md': '---\ntitle: Home\n---\n\n# Home\n\nMain page.',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/index.md')), 'index.md should exist')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/README.md')), 'README.md should also exist')

    const index = await readFile(join(paths.workspace, 'src/content/docs/index.md'), 'utf-8')
    const readme = await readFile(join(paths.workspace, 'src/content/docs/README.md'), 'utf-8')
    assert.ok(index.includes('Main page'), 'index.md should have correct content')
    assert.ok(readme.includes('Project readme'), 'README.md should have correct content')
  })

  it('should handle case-insensitive README variants', async () => {
    const paths = getTestPaths('readme-case-variants', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test',
      'readme.md': '---\ntitle: lowercase\n---\n\n# lowercase readme',
      'guides/Readme.md': '---\ntitle: Mixed Case\n---\n\n# Mixed case readme',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/index.md')), 'readme.md should become index.md')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/guides/index.md')), 'Readme.md should become index.md')
    assert.ok(!existsSync(join(paths.workspace, 'src/content/docs/readme.md')), 'readme.md should not exist')
    assert.ok(!existsSync(join(paths.workspace, 'src/content/docs/guides/Readme.md')), 'Readme.md should not exist')
  })

  it('should preserve README extension when converting to MDX', async () => {
    const paths = getTestPaths('readme-mdx-conversion', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test',
      'README.md':
        '---\ntitle: Home\n---\nimport { Card } from "@astrojs/starlight/components"\n\n# Home\n\n<Card title="Test" />\n',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')
    assert.ok(existsSync(join(paths.workspace, 'src/content/docs/index.mdx')), 'Should become index.mdx due to JSX')
    assert.ok(!existsSync(join(paths.workspace, 'src/content/docs/README.md')), 'README.md should not exist')
    assert.ok(!existsSync(join(paths.workspace, 'src/content/docs/README.mdx')), 'README.mdx should not exist')
  })
})

describe('README Link Transformation', () => {
  it('should transform README.md links to index.md', async () => {
    const paths = getTestPaths('transform-readme-links', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test',
      'index.md': '---\ntitle: Home\n---\n\nSee [Getting Started](guides/README.md)',
      'guides/README.md': '---\ntitle: Guide\n---\n\n# Guide',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')

    const content = await readFile(join(paths.workspace, 'src/content/docs/index.md'), 'utf-8')
    assert.ok(content.includes('[Getting Started](guides/index.md)'), 'Should transform README.md to index.md')
    assert.ok(!content.includes('README.md'), 'Should not contain README.md references')
  })

  it('should transform case-insensitive README links', async () => {
    const paths = getTestPaths('transform-case-insensitive', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test',
      'index.md': `---
title: Home
---

Links:
- [Guide 1](guides/readme.md)
- [Guide 2](api/README.md)
- [Guide 3](docs/Readme.md)`,
      'guides/readme.md': '# Guide 1',
      'api/README.md': '# Guide 2',
      'docs/Readme.md': '# Guide 3',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')

    const content = await readFile(join(paths.workspace, 'src/content/docs/index.md'), 'utf-8')
    assert.ok(content.includes('guides/index.md'), 'Should transform readme.md')
    assert.ok(content.includes('api/index.md'), 'Should transform README.md')
    assert.ok(content.includes('docs/index.md'), 'Should transform Readme.md')
  })

  it('should not transform README.md in code blocks', async () => {
    const paths = getTestPaths('preserve-code-blocks', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test',
      'index.md': `---
title: Home
---

Example link: [README](README.md)

In code:

\`\`\`bash
cat README.md
\`\`\`

Inline \`README.md\` reference.`,
      'README.md': '# Home',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')

    const content = await readFile(join(paths.workspace, 'src/content/docs/index.md'), 'utf-8')
    assert.ok(content.includes('[README](index.md)'), 'Should transform markdown link')
    assert.ok(content.includes('cat README.md'), 'Should preserve README.md in code block')
    assert.ok(content.includes('`README.md`'), 'Should preserve inline code')
  })

  it('should transform README links with different extensions', async () => {
    const paths = getTestPaths('transform-extensions', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test',
      'index.md': `---
title: Home
---

Links:
- [MD Guide](guides/README.md)
- [MDX Guide](api/README.mdx)
- [MDOC Guide](docs/README.mdoc)`,
      'guides/README.md': '# MD',
      'api/README.mdx': '# MDX',
      'docs/README.mdoc': '# MDOC',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')

    const content = await readFile(join(paths.workspace, 'src/content/docs/index.md'), 'utf-8')
    assert.ok(content.includes('guides/index.md'), 'Should transform README.md')
    assert.ok(content.includes('api/index.mdx'), 'Should transform README.mdx')
    assert.ok(content.includes('docs/index.mdoc'), 'Should transform README.mdoc')
  })

  it('should transform relative README links', async () => {
    const paths = getTestPaths('transform-relative-links', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test',
      'guides/getting-started.md': `---
title: Getting Started
---

- [Home](../README.md)
- [API](../api/README.md)
- [This section](./README.md)`,
      'README.md': '# Home',
      'api/README.md': '# API',
      'guides/README.md': '# Guide',
    })

    const {exitCode} = await runCLI(['prepare', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'CLI should succeed')

    const content = await readFile(join(paths.workspace, 'src/content/docs/guides/getting-started.md'), 'utf-8')
    assert.ok(content.includes('../index.md'), 'Should transform ../README.md')
    assert.ok(content.includes('../api/index.md'), 'Should transform ../api/README.md')
    assert.ok(content.includes('./index.md'), 'Should transform ./README.md')
  })
})
