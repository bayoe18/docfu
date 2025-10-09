import chokidar from 'chokidar'
import {processDocuments, getSource} from './prepare.js'

const source = getSource()

try {
  const success = await processDocuments(source)
  if (!success) {
    process.exit(1)
  }
} catch (error) {
  console.error('✗ Initial processing failed:', error.message)
  process.exit(1)
}

console.log(`● Watching for changes in ${source}...`)
console.log('   Press Ctrl+C to stop watching')

const watcher = chokidar.watch(source, {
  ignored: /(^|[\/\\])\..*/,
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 1000,
    pollInterval: 100,
  },
})

// Debounce processing to avoid multiple rapid operations
let processTimeout
const debouncedProcess = () => {
  clearTimeout(processTimeout)
  processTimeout = setTimeout(async () => {
    console.log('◐ Changes detected, processing...')
    await processDocuments(source)
  }, 500)
}

watcher
  .on('add', debouncedProcess)
  .on('change', debouncedProcess)
  .on('unlink', debouncedProcess)
  .on('error', error => console.error('✗ Watcher error:', error))

process.on('SIGINT', () => {
  console.log('\n■ Stopping file watcher...')
  watcher.close()
  process.exit(0)
})
