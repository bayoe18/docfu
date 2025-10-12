import {defineMarkdocConfig, component} from '@astrojs/markdoc/config'
import Markdoc from '@markdoc/markdoc'
import starlightMarkdoc from '@astrojs/starlight-markdoc'
import {join, dirname} from 'path'
import {fileURLToPath} from 'url'
import {extractPropsFromComponent, getDocfuComponents} from './src/utils/components.js'
import {loadManifest} from './src/utils/docfu.js'

const {Tag} = Markdoc
const __dirname = dirname(fileURLToPath(import.meta.url))
const preset = starlightMarkdoc()
// Load manifest from DOCFU_ROOT/manifest.json
const manifest = loadManifest()
const userComponents = manifest.components?.items || []

// Build tags with dynamic attribute discovery
const tags = {...preset.tags}

// DocFu-provided components (dynamic discovery from src/components/)
const docfuComponents = getDocfuComponents()
for (const name of docfuComponents) {
  const tagName = name.toLowerCase()
  const componentPath = join(__dirname, `src/components/${name}.astro`)
  const props = extractPropsFromComponent(componentPath)

  const attributes = {}
  for (const prop of props) {
    attributes[prop] = {required: false}
  }

  tags[tagName] = {
    render: component(`./src/components/${name}.astro`),
    attributes,
  }
}

// Register user components as tags (can override DocFu components)
for (const comp of userComponents) {
  const tagName = comp.name.toLowerCase()
  // comp.path is relative to src/components/
  const props = extractPropsFromComponent(join(__dirname, `src/components/${comp.path}`))

  const attributes = {}
  for (const prop of props) attributes[prop] = {required: false}

  tags[tagName] = {
    render: component(`./src/components/${comp.path}`),
    attributes,
  }
}

export default defineMarkdocConfig({
  extends: [preset],
  nodes: {
    fence: {
      render: component('./src/components/Fence.astro'),
      attributes: {
        ...preset.nodes.fence.attributes,
      },
    },
  },
  tags,
})
