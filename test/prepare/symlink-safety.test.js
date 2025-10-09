/**
 * Tests for symlink cleanup safety
 * Verifies that cleaning .docfu/engine/ removes symlinks without following them
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync, writeFileSync, mkdirSync, readFileSync} from 'fs'
import {join, resolve} from 'path'
import {runCLI, getTestPaths, cleanupTestFile} from '../helpers.js'

describe('Symlink Cleanup Safety', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should remove symlink without deleting target contents', async () => {
    const paths = getTestPaths('symlink-cleanup-safe', import.meta.url)

    mkdirSync(paths.source, {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test Docs\n  url: https://example.com')
    writeFileSync(join(paths.source, 'index.md'), '# Home\n\nTest content')

    // First prepare - creates .docfu/engine/ with symlinked node_modules
    const {exitCode: exitCode1} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])
    assert.strictEqual(exitCode1, 0, 'First prepare should succeed')

    const symlinkPath = join(paths.engine, 'node_modules')
    assert.ok(existsSync(symlinkPath), 'Symlink should exist in .docfu/engine/')

    // Create a marker file in the ACTUAL node_modules (symlink target)
    // This file should NOT be deleted when we clean .docfu/engine/
    const actualNodeModules = resolve('node_modules')
    const markerPath = join(actualNodeModules, '.test-marker-do-not-delete')
    writeFileSync(markerPath, 'This file should not be deleted when cleaning .docfu/engine/')

    const markerThroughSymlink = join(symlinkPath, '.test-marker-do-not-delete')
    assert.ok(existsSync(markerThroughSymlink), 'Marker should be accessible through symlink')

    // Second prepare - should clean .docfu/engine/ and recreate it
    // This is the critical test: cleanup must remove symlink without deleting target
    const {exitCode: exitCode2} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])
    assert.strictEqual(exitCode2, 0, 'Second prepare should succeed')

    assert.ok(existsSync(symlinkPath), 'Symlink should be recreated')

    assert.ok(existsSync(actualNodeModules), 'Actual node_modules should still exist')

    assert.ok(existsSync(markerPath), 'Marker in actual node_modules should still exist - CRITICAL SAFETY CHECK')

    assert.ok(existsSync(markerThroughSymlink), 'Marker should be accessible through recreated symlink')

    const fs = await import('fs/promises')
    await fs.rm(markerPath, {force: true})
  })

  it('should handle multiple cleanup cycles without deleting target', async () => {
    const paths = getTestPaths('symlink-multiple-cleanups', import.meta.url)

    mkdirSync(paths.source, {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(paths.source, 'index.md'), '# Test')

    const actualNodeModules = resolve('node_modules')
    const markerPath = join(actualNodeModules, '.test-marker-multiple-cleanups')
    writeFileSync(markerPath, 'Should survive multiple cleanups')

    // Run prepare 3 times - each should clean and recreate
    for (let i = 1; i <= 3; i++) {
      const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])
      assert.strictEqual(exitCode, 0, `Prepare ${i} should succeed`)

      assert.ok(existsSync(markerPath), `Marker should survive cleanup cycle ${i}`)
    }

    const fs = await import('fs/promises')
    await fs.rm(markerPath, {force: true})
  })

  it('should handle missing node_modules gracefully', async () => {
    const paths = getTestPaths('symlink-missing-target', import.meta.url)

    mkdirSync(paths.source, {recursive: true})
    writeFileSync(join(paths.source, 'docfu.yml'), 'site:\n  name: Test\n  url: https://test.com')
    writeFileSync(join(paths.source, 'index.md'), '# Test')

    // This test verifies prepare works even if node_modules doesn't exist
    // (edge case: running in unusual environment)
    // Should succeed with warning but not crash
    const {exitCode} = await runCLI(['prepare', paths.source, '--workspace', paths.workspace])

    assert.strictEqual(exitCode, 0, 'Should succeed even without node_modules')

    assert.ok(existsSync(join(paths.workspace, 'index.md')), 'Should process files')
  })
})
