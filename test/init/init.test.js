/**
 * CLI tests for init command
 * Tests docfu init configuration file creation
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, mkdirSync, writeFileSync} from 'fs'
import {readFile} from 'fs/promises'
import {join} from 'path'
import {runCLI, getTestPaths, cleanupTestFile} from '../helpers.js'

describe('Init Command', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should create docfu.yml with default values using --yes flag', async () => {
    const paths = getTestPaths('init-defaults', import.meta.url)
    mkdirSync(paths.source, {recursive: true})

    const {exitCode, stdout} = await runCLI(['init', paths.source, '--yes'])

    assert.strictEqual(exitCode, 0, 'Should exit successfully')
    assert.ok(stdout.includes('Created'), 'Should show success message')

    const configPath = join(paths.source, 'docfu.yml')
    assert.ok(existsSync(configPath), 'Should create docfu.yml')

    const content = await readFile(configPath, 'utf-8')
    assert.ok(content.includes('workspace: .docfu/workspace'), 'Should use default workspace')
    assert.ok(content.includes('dist: .docfu/dist'), 'Should use default dist')
    assert.ok(content.includes('site:'), 'Should include site config')
  })

  it('should create docfu.yml with custom workspace and dist directories', async () => {
    const paths = getTestPaths('init-custom', import.meta.url)
    mkdirSync(paths.source, {recursive: true})

    const {exitCode, stdout} = await runCLI(['init', paths.source, '--workspace', 'custom-ws', '--dist', 'custom-dist'])

    assert.strictEqual(exitCode, 0, 'Should exit successfully')
    assert.ok(stdout.includes('Created'), 'Should show success message')

    const configPath = join(paths.source, 'docfu.yml')
    const content = await readFile(configPath, 'utf-8')
    assert.ok(content.includes('workspace: custom-ws'), 'Should use custom workspace')
    assert.ok(content.includes('dist: custom-dist'), 'Should use custom dist')
  })

  it('should overwrite existing config with --yes flag', async () => {
    const paths = getTestPaths('init-overwrite', import.meta.url)
    mkdirSync(paths.source, {recursive: true})

    const configPath = join(paths.source, 'docfu.yml')
    writeFileSync(configPath, 'existing: config\nold: value')

    const {exitCode, stdout} = await runCLI(['init', paths.source, '--yes'])

    assert.strictEqual(exitCode, 0, 'Should exit successfully')
    assert.ok(stdout.includes('Created'), 'Should show success message')

    const content = await readFile(configPath, 'utf-8')
    assert.ok(!content.includes('old: value'), 'Should overwrite old config')
    assert.ok(content.includes('workspace: .docfu/workspace'), 'Should have new config')
  })

  it('should handle custom workspace and dist with --yes flag', async () => {
    const paths = getTestPaths('init-custom-yes', import.meta.url)
    mkdirSync(paths.source, {recursive: true})

    const {exitCode} = await runCLI([
      'init',
      paths.source,
      '--workspace',
      'custom-workspace',
      '--dist',
      'custom-dist',
      '--yes',
    ])

    assert.strictEqual(exitCode, 0, 'Should exit successfully')

    const configPath = join(paths.source, 'docfu.yml')
    const content = await readFile(configPath, 'utf-8')
    assert.ok(content.includes('workspace: custom-workspace'), 'Should use custom workspace')
    assert.ok(content.includes('dist: custom-dist'), 'Should use custom dist')
  })

  it('should show help with init --help flag', async () => {
    const {stdout, exitCode} = await runCLI(['init', '--help'])

    assert.strictEqual(exitCode, 0, 'Should exit successfully')
    assert.ok(stdout.includes('Initialize DocFu configuration'), 'Should show init description')
    assert.ok(stdout.includes('--workspace'), 'Should mention workspace option')
    assert.ok(stdout.includes('--dist'), 'Should mention dist option')
    assert.ok(stdout.includes('--yes'), 'Should mention yes option')
  })

  it('should handle relative paths correctly', async () => {
    const paths = getTestPaths('init-relative', import.meta.url)
    mkdirSync(paths.source, {recursive: true})

    const {exitCode} = await runCLI(['init', paths.source, '--workspace', '../workspace', '--yes'])

    assert.strictEqual(exitCode, 0, 'Should exit successfully')

    const configPath = join(paths.source, 'docfu.yml')
    const content = await readFile(configPath, 'utf-8')
    assert.ok(content.includes('workspace: ../workspace'), 'Should preserve relative paths')
  })
})
