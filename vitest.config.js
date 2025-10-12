import {defineConfig} from 'vitest/config'
import {availableParallelism} from 'node:os'

const cores = availableParallelism()
const maxWorkers = cores <= 2 ? 1 : cores <= 4 ? 2 : 3

export default defineConfig({
  test: {
    environment: 'node',
    bail: 1,
    globals: false,
    minWorkers: 1,
    maxWorkers,
    pool: 'forks',
    sequence: {
      concurrent: true,
      shuffle: {files: true, tests: true},
    },
    testTimeout: 300000,
  },
})
