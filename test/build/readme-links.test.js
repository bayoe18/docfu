/**
 * Build tests for README → index renaming and link transformation
 * Validates that the final HTML has correct hrefs
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {readFile} from 'fs/promises'
import {join} from 'path'
import {runCLI, getTestPaths, createInlineFixtures, cleanupTestFile} from '../helpers.js'

beforeAll(() => cleanupTestFile(import.meta.url))

describe('README Links in Built HTML', () => {
  it('should build correct hrefs for README links', async () => {
    const paths = getTestPaths('readme-html-links', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test',
      'index.md': `---
title: Home
---

Links to READMEs:
- [Guides](guides/README.md)
- [API](api/README.md)`,
      'guides/README.md': '---\ntitle: Guides\n---\n\n# Guides',
      'api/README.md': '---\ntitle: API\n---\n\n# API',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist], {
      env: {DOCFU_ENGINE: paths.engine},
    })

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const indexHtml = await readFile(join(paths.dist, 'index.html'), 'utf-8')

    const hrefs = [...indexHtml.matchAll(/href="([^"]*)"/g)].map(m => m[1])

    // Should have links to guides and api (not README.md)
    const hasGuideLink = hrefs.some(href => href.includes('index.md') && href.includes('guides'))
    const hasApiLink = hrefs.some(href => href.includes('index.md') && href.includes('api'))

    assert.ok(hasGuideLink, 'Should have link to guides/index.md')
    assert.ok(hasApiLink, 'Should have link to api/index.md')

    const hasReadmeHref = hrefs.some(href => /readme\.md/i.test(href))
    assert.ok(!hasReadmeHref, 'Should not have any README.md hrefs')
  })

  it('should build correct page URLs for renamed READMEs', async () => {
    const paths = getTestPaths('readme-page-urls', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test',
      'README.md': '---\ntitle: Home\n---\n\n# Home',
      'guides/README.md': '---\ntitle: Guides\n---\n\n# Guides Landing',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist], {
      env: {DOCFU_ENGINE: paths.engine},
    })

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    assert.ok(existsSync(join(paths.dist, 'index.html')), 'Root README should become index.html')
    const rootHtml = await readFile(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(rootHtml.includes('Home'), 'Root index should have Home content')

    assert.ok(existsSync(join(paths.dist, 'guides', 'index.html')), 'guides/README should become guides/index.html')
    const guidesHtml = await readFile(join(paths.dist, 'guides/index.html'), 'utf-8')
    assert.ok(guidesHtml.includes('>Guides<'), 'Guides index should have correct title')
  })

  it('should handle relative README links correctly in built HTML', async () => {
    const paths = getTestPaths('readme-relative-links', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test',
      'README.md': '---\ntitle: Home\n---\n\n# Home',
      'guides/getting-started.md': `---
title: Getting Started
---

Navigation:
- [Home](../README.md)
- [Guides Home](./README.md)`,
      'guides/README.md': '---\ntitle: Guides\n---\n\n# Guides',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--workspace', paths.workspace, '--dist', paths.dist], {
      env: {DOCFU_ENGINE: paths.engine},
    })

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const gettingStartedHtml = await readFile(join(paths.dist, 'guides/getting-started', 'index.html'), 'utf-8')

    const hrefs = [...gettingStartedHtml.matchAll(/href="([^"]*)"/g)].map(m => m[1])

    // Should have links transformed from README.md to index.md
    const hasIndexLinks = hrefs.some(href => href.includes('index.md'))
    assert.ok(hasIndexLinks, 'Should have links to index.md files')

    const hasReadmeHref = hrefs.some(href => /readme\.md/i.test(href))
    assert.ok(!hasReadmeHref, 'Should not have any README.md hrefs')
  })
})
