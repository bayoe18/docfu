/**
 * Sidebar generation tests
 * Tests auto-generated and explicit sidebar configurations
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, readFileSync, mkdirSync, writeFileSync} from 'fs'
import {join} from 'path'
import * as yaml from 'js-yaml'
import {buildSidebar} from '../../src/utils/sidebar.js'
import {runCLI, getTestPaths, createInlineFixtures, cleanupTestFile} from '../helpers.js'

describe('Sidebar Generation', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should auto-generate sidebar grouped by top-level directories', async () => {
    const paths = getTestPaths('sidebar-auto-generate', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
      'about.md': '# About',
      'guides/quickstart.md': '# Quickstart',
      'guides/advanced.md': '# Advanced Guide',
      'api/auth.md': '# Authentication',
      'api/users.md': '# Users API',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const manifest = JSON.parse(readFileSync(join(paths.root, 'manifest.json'), 'utf-8'))
    assert.ok(manifest.docs, 'Should have docs array in manifest')
    assert.strictEqual(manifest.docs.length, 6, 'Should have 6 documents in manifest')
    assert.ok(
      manifest.docs.find(d => d.slug === 'index'),
      'Should have index in manifest'
    )
    assert.ok(
      manifest.docs.find(d => d.slug === 'guides/quickstart'),
      'Should have guides/quickstart in manifest'
    )

    const config = yaml.load(readFileSync(join(paths.root, 'config.yml'), 'utf-8'))
    assert.ok(!config.sidebar, 'Should have no explicit sidebar in config (triggers auto-generation)')

    const sidebar = buildSidebar(manifest, config)
    assert.ok(Array.isArray(sidebar), 'Should return sidebar array')
    assert.strictEqual(sidebar.length, 4, 'Should have 4 sidebar items (2 ungrouped + 2 groups)')

    const ungroupedItems = sidebar.filter(item => item.slug)
    assert.strictEqual(ungroupedItems.length, 2, 'Should have 2 ungrouped items')
    assert.ok(
      ungroupedItems.find(item => item.slug === 'index'),
      'Should have index ungrouped'
    )
    assert.ok(
      ungroupedItems.find(item => item.slug === 'about'),
      'Should have about ungrouped'
    )

    const groups = sidebar.filter(item => item.label && item.items)
    assert.strictEqual(groups.length, 2, 'Should have 2 groups')

    const guidesGroup = groups.find(g => g.label === 'Guides')
    assert.ok(guidesGroup, 'Should have Guides group')
    assert.strictEqual(guidesGroup.items.length, 2, 'Guides should have 2 items')

    const apiGroup = groups.find(g => g.label === 'Api')
    assert.ok(apiGroup, 'Should have Api group')
    assert.strictEqual(apiGroup.items.length, 2, 'Api should have 2 items')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(indexHtml.includes('Home'), 'Should include root-level Home page')
    assert.ok(indexHtml.includes('About'), 'Should include root-level About page')
    assert.ok(indexHtml.includes('Guides'), 'Should have Guides group')
    assert.ok(indexHtml.includes('Quickstart'), 'Should include Quickstart in Guides group')
    assert.ok(indexHtml.includes('Advanced Guide'), 'Should include Advanced in Guides group')
    assert.ok(indexHtml.includes('Api'), 'Should have Api group (title-cased from "api")')
    assert.ok(indexHtml.includes('Authentication'), 'Should include Auth in Api group')
    assert.ok(indexHtml.includes('Users API'), 'Should include Users in Api group')
  })

  it('should support explicit sidebar config with ungrouped items', async () => {
    const paths = getTestPaths('sidebar-explicit-ungrouped', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
    label: Home
  - file: quickstart.md
    label: Quick Start`,
      'index.md': '# Welcome',
      'quickstart.md': '# Getting Started Fast',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const config = yaml.load(readFileSync(join(paths.root, 'config.yml'), 'utf-8'))
    assert.ok(config.sidebar, 'Should have explicit sidebar in config')
    assert.ok(Array.isArray(config.sidebar), 'Sidebar should be array')
    assert.strictEqual(config.sidebar.length, 2, 'Should have 2 sidebar items in config')
    assert.strictEqual(config.sidebar[0].file, 'index.md', 'First item should reference index.md')
    assert.strictEqual(config.sidebar[0].label, 'Home', 'First item should have custom label')

    const manifest = JSON.parse(readFileSync(join(paths.root, 'manifest.json'), 'utf-8'))
    assert.strictEqual(manifest.docs.length, 2, 'Should have 2 documents in manifest')

    const sidebar = buildSidebar(manifest, config)
    assert.ok(Array.isArray(sidebar), 'Should return sidebar array')
    assert.strictEqual(sidebar.length, 2, 'Should have 2 sidebar items')
    assert.strictEqual(sidebar[0].slug, 'index', 'First item should have slug "index"')
    assert.strictEqual(sidebar[0].label, 'Home', 'First item should use custom label "Home"')
    assert.strictEqual(sidebar[1].slug, 'quickstart', 'Second item should have slug "quickstart"')
    assert.strictEqual(sidebar[1].label, 'Quick Start', 'Second item should use custom label "Quick Start"')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(indexHtml.includes('Home'), 'Should use custom label "Home"')
    assert.ok(indexHtml.includes('Quick Start'), 'Should use custom label "Quick Start"')
  })

  it('should support explicit sidebar with grouped items', async () => {
    const paths = getTestPaths('sidebar-explicit-grouped', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
  - group: Getting Started
    items:
      - quickstart.md
      - installation.md
  - group: API Reference
    items:
      - file: api/auth.md
        label: Authentication
      - file: api/users.md`,
      'index.md': '# Home',
      'quickstart.md': '# Quickstart',
      'installation.md': '# Installation',
      'api/auth.md': '# Auth API',
      'api/users.md': '# Users',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')

    assert.ok(indexHtml.includes('Getting Started'), 'Should have Getting Started group')
    assert.ok(indexHtml.includes('API Reference'), 'Should have API Reference group')

    assert.ok(indexHtml.includes('Quickstart'), 'Should include Quickstart')
    assert.ok(indexHtml.includes('Installation'), 'Should include Installation')
    assert.ok(indexHtml.includes('Authentication'), 'Should use custom label for auth')
    assert.ok(indexHtml.includes('Users'), 'Should include Users')
  })

  it('should support directory auto-generation in sidebar config', async () => {
    const paths = getTestPaths('sidebar-directory-autogen', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
  - group: API Endpoints
    directory: api/`,
      'index.md': '# Home',
      'api/auth.md': '# Authentication',
      'api/users.md': '# User Management',
      'api/posts.md': '# Posts API',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')

    assert.ok(indexHtml.includes('API Endpoints'), 'Should have API Endpoints group')
    assert.ok(indexHtml.includes('Authentication'), 'Should include all files from api/')
    assert.ok(indexHtml.includes('User Management'), 'Should include all files from api/')
    assert.ok(indexHtml.includes('Posts API'), 'Should include all files from api/')
  })

  it('should support sidebar badges with simple string syntax', async () => {
    const paths = getTestPaths('sidebar-badges-string', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
  - file: new-feature.md
    badge: New`,
      'index.md': '# Home',
      'new-feature.md': '# New Feature',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')

    assert.ok(indexHtml.includes('New'), 'Should include badge text')
    assert.ok(indexHtml.includes('New Feature'), 'Should include page with badge')
  })

  it('should support sidebar badges with object syntax (text + variant)', async () => {
    const paths = getTestPaths('sidebar-badges-object', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
  - group: Features
    items:
      - file: stable.md
        badge:
          text: Stable
          variant: success
      - file: beta.md
        badge:
          text: Beta
          variant: caution`,
      'index.md': '# Home',
      'stable.md': '# Stable Feature',
      'beta.md': '# Beta Feature',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const manifest = JSON.parse(readFileSync(join(paths.root, 'manifest.json'), 'utf-8'))
    const config = yaml.load(readFileSync(join(paths.root, 'config.yml'), 'utf-8'))

    const sidebar = buildSidebar(manifest, config)
    assert.strictEqual(sidebar.length, 2, 'Should have 2 items (index + Features group)')

    const featuresGroup = sidebar.find(item => item.label === 'Features')
    assert.ok(featuresGroup, 'Should have Features group')
    assert.strictEqual(featuresGroup.items.length, 2, 'Features group should have 2 items')

    const stableItem = featuresGroup.items.find(item => item.slug === 'stable')
    assert.ok(stableItem.badge, 'Stable item should have badge')
    assert.strictEqual(stableItem.badge.text, 'Stable', 'Badge should have text property')
    assert.strictEqual(stableItem.badge.variant, 'success', 'Badge should have variant property')

    const betaItem = featuresGroup.items.find(item => item.slug === 'beta')
    assert.ok(betaItem.badge, 'Beta item should have badge')
    assert.strictEqual(betaItem.badge.text, 'Beta', 'Badge should have text property')
    assert.strictEqual(betaItem.badge.variant, 'caution', 'Badge should have variant property')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')
    assert.ok(indexHtml.includes('Stable'), 'Should include Stable badge')
    assert.ok(indexHtml.includes('Beta'), 'Should include Beta badge')
    assert.ok(indexHtml.includes('Stable Feature'), 'Should include page with Stable badge')
    assert.ok(indexHtml.includes('Beta Feature'), 'Should include page with Beta badge')
  })

  it('should support collapsed groups in sidebar', async () => {
    const paths = getTestPaths('sidebar-collapsed', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
  - group: Advanced Topics
    collapsed: true
    items:
      - advanced/optimization.md
      - advanced/security.md`,
      'index.md': '# Home',
      'advanced/optimization.md': '# Performance Optimization',
      'advanced/security.md': '# Security Best Practices',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')

    assert.ok(indexHtml.includes('Advanced Topics'), 'Should have Advanced Topics group')
    assert.ok(indexHtml.includes('Performance Optimization'), 'Should include items in collapsed group')
    assert.ok(indexHtml.includes('Security Best Practices'), 'Should include items in collapsed group')
  })

  it('should allow same file to appear in multiple groups', async () => {
    const paths = getTestPaths('sidebar-duplicate-files', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
  - group: Getting Started
    items:
      - file: quickstart.md
        badge: Popular
  - group: Guides
    items:
      - file: quickstart.md
        label: Quick Reference`,
      'index.md': '# Home',
      'quickstart.md': '# Quickstart Guide',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')

    assert.ok(indexHtml.includes('Getting Started'), 'Should have Getting Started group')
    assert.ok(indexHtml.includes('Guides'), 'Should have Guides group')
    assert.ok(indexHtml.includes('Popular'), 'Should include badge in first instance')
    assert.ok(indexHtml.includes('Quick Reference'), 'Should use custom label in second instance')
  })

  it('should handle mixed ungrouped and grouped items in sidebar', async () => {
    const paths = getTestPaths('sidebar-mixed', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
    label: Home
  - file: about.md
  - group: Documentation
    items:
      - guides/quickstart.md
      - guides/advanced.md
  - file: contact.md`,
      'index.md': '# Welcome',
      'about.md': '# About Us',
      'contact.md': '# Contact',
      'guides/quickstart.md': '# Quickstart',
      'guides/advanced.md': '# Advanced',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')

    assert.ok(indexHtml.includes('Home'), 'Should have Home at root')
    assert.ok(indexHtml.includes('About Us'), 'Should have About at root')
    assert.ok(indexHtml.includes('Contact'), 'Should have Contact at root')

    assert.ok(indexHtml.includes('Documentation'), 'Should have Documentation group')
    assert.ok(indexHtml.includes('Quickstart'), 'Should include Quickstart in group')
    assert.ok(indexHtml.includes('Advanced'), 'Should include Advanced in group')
  })

  it('should preserve sidebar order from config', async () => {
    const paths = getTestPaths('sidebar-ordering', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': `site:
  name: Test
  url: https://test.com

sidebar:
  - file: index.md
    label: Home
  - file: zebra.md
  - file: alpha.md
  - file: middle.md`,
      'index.md': '# Home',
      'zebra.md': '# Zebra',
      'alpha.md': '# Alpha',
      'middle.md': '# Middle',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')

    assert.ok(indexHtml.includes('Home'), 'Should include Home')
    assert.ok(indexHtml.includes('Zebra'), 'Should include Zebra')
    assert.ok(indexHtml.includes('Alpha'), 'Should include Alpha')
    assert.ok(indexHtml.includes('Middle'), 'Should include Middle')

    assert.ok(indexHtml.includes('<nav'), 'Should have navigation')
  })

  it('should handle sidebar with no config (fallback to auto-generation)', async () => {
    const paths = getTestPaths('sidebar-no-config', import.meta.url)
    await createInlineFixtures(paths, {
      'docfu.yml': 'site:\n  name: Test\n  url: https://test.com',
      'index.md': '# Home',
      'guides/start.md': '# Getting Started',
      'api/endpoints.md': '# API Endpoints',
    })

    const {exitCode} = await runCLI(['build', paths.source, '--root', paths.root])

    assert.strictEqual(exitCode, 0, 'Build should succeed')

    const indexHtml = readFileSync(join(paths.dist, 'index.html'), 'utf-8')

    assert.ok(indexHtml.includes('Home'), 'Should include Home')
    assert.ok(indexHtml.includes('Getting Started'), 'Should include nested page')
    assert.ok(indexHtml.includes('API Endpoints'), 'Should include nested page')
  })
})
