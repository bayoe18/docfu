import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    minWorkers: 1,
    maxWorkers: 2,
    sequence: {
      concurrent: true,
      shuffle: {
        files: true,
        tests: true,
      },
    },
    testTimeout: 300000,
  },
})
