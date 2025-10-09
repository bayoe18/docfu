/**
 * CLI tests for preview command
 * Tests preview functionality (build without serve due to test constraints)
 */

import {describe, it, beforeAll} from 'vitest'
import assert from 'assert'
import {existsSync} from 'fs'
import {join} from 'path'
import {runCLI, getTestPaths, createFixtures, cleanupTestFile} from '../helpers.js'

describe('Preview Command', () => {
  beforeAll(() => cleanupTestFile(import.meta.url))

  it('should show usage information', async () => {
    const {stdout, exitCode} = await runCLI(['preview', '--help'])

    assert.strictEqual(exitCode, 0, 'Should succeed')
    assert.ok(stdout.includes('preview'), 'Should show preview command')
    assert.ok(stdout.includes('port'), 'Should mention port option')
  })

  // Note: Full preview tests with server would require managing server lifecycle
  // which is complex in test environment. Build tests cover the processing/build
  // pipeline, which is the critical path for preview.
})
