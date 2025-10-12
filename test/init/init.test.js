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
    assert.ok(content.includes('site:'), 'Should include site config')
    assert.ok(content.includes('name: Documentation'), 'Should have site name')
    assert.ok(content.includes('url: https://docs.example.com'), 'Should have site URL')
  })

  it('should create docfu.yml from template', async () => {
    const paths = getTestPaths('init-custom', import.meta.url)
    mkdirSync(paths.source, {recursive: true})

    const {exitCode, stdout} = await runCLI(['init', paths.source, '--yes'])

    assert.strictEqual(exitCode, 0, 'Should exit successfully')
    assert.ok(stdout.includes('Created'), 'Should show success message')

    const configPath = join(paths.source, 'docfu.yml')
    const content = await readFile(configPath, 'utf-8')
    assert.ok(content.includes('# DocFu Configuration'), 'Should include config header')
    assert.ok(content.includes('assets:'), 'Should include assets config')
    assert.ok(content.includes('components:'), 'Should include components config')
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
    assert.ok(content.includes('site:'), 'Should have new config')
  })

  it('should handle --yes flag without prompts', async () => {
    const paths = getTestPaths('init-custom-yes', import.meta.url)
    mkdirSync(paths.source, {recursive: true})

    const {exitCode} = await runCLI(['init', paths.source, '--yes'])

    assert.strictEqual(exitCode, 0, 'Should exit successfully')

    const configPath = join(paths.source, 'docfu.yml')
    const content = await readFile(configPath, 'utf-8')
    assert.ok(content.includes('site:'), 'Should create config file')
    assert.ok(content.includes('assets:'), 'Should include assets config')
  })

  it('should show help with init --help flag', async () => {
    const {stdout, exitCode} = await runCLI(['init', '--help'])

    assert.strictEqual(exitCode, 0, 'Should exit successfully')
    assert.ok(stdout.includes('Initialize DocFu configuration'), 'Should show init description')
    assert.ok(stdout.includes('--root'), 'Should mention root option')
    assert.ok(stdout.includes('--yes'), 'Should mention yes option')
  })

  it('should create config in specified source directory', async () => {
    const paths = getTestPaths('init-relative', import.meta.url)
    mkdirSync(paths.source, {recursive: true})

    const {exitCode} = await runCLI(['init', paths.source, '--yes'])

    assert.strictEqual(exitCode, 0, 'Should exit successfully')

    const configPath = join(paths.source, 'docfu.yml')
    assert.ok(existsSync(configPath), 'Should create config in source directory')
    const content = await readFile(configPath, 'utf-8')
    assert.ok(content.includes('site:'), 'Should have site config')
  })
})
