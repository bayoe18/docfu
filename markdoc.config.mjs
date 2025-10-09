import {defineMarkdocConfig, component} from '@astrojs/markdoc/config'
import Markdoc from '@markdoc/markdoc'
import starlightMarkdoc from '@astrojs/starlight-markdoc'
import {join, dirname} from 'path'
import {fileURLToPath} from 'url'
import {extractPropsFromComponent} from './src/utils/components.js'
import {getWorkspace, loadManifest} from './src/utils/docfu.js'
import {DOCFU_COMPONENTS} from './scripts/lib/components.js'

const {Tag} = Markdoc
const __dirname = dirname(fileURLToPath(import.meta.url))
const preset = starlightMarkdoc()
const workspace = getWorkspace()
const manifest = loadManifest(workspace)
const userComponents = manifest.components?.items || []

// Build tags with dynamic attribute discovery
const tags = {...preset.tags}

// DocFu-provided components (static list, dynamic prop discovery)
const docfuComponents = DOCFU_COMPONENTS
for (const name of docfuComponents) {
  const tagName = name.toLowerCase()
  const componentPath = join(__dirname, `src/components/${name}.astro`)
  const props = extractPropsFromComponent(componentPath)

  const attributes = {}
  for (const prop of props) {
    attributes[prop] = {type: String, required: false}
  }

  tags[tagName] = {
    render: component(`./src/components/${name}.astro`),
    attributes,
  }
}

// Register user components as tags (can override DocFu components)
for (const comp of userComponents) {
  const tagName = comp.name.toLowerCase()
  const props = extractPropsFromComponent(join(workspace, comp.path))

  const attributes = {}
  for (const prop of props) attributes[prop] = {type: String, required: false}

  tags[tagName] = {
    render: component(`../workspace/${comp.path}`),
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
