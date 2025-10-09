// @ts-check
import {defineConfig} from 'astro/config'
import starlight from '@astrojs/starlight'
import markdoc from '@astrojs/markdoc'
import mermaid from 'astro-mermaid'
import starlightGithubAlerts from 'starlight-github-alerts'
import starlightHeadingBadges from 'starlight-heading-badges'
import starlightLlmsTxt from 'starlight-llms-txt'
import starlightThemeNova from 'starlight-theme-nova'
import {getStarlightOverrides} from './src/utils/components.js'
import {getWorkspace, loadConfig, loadManifest} from './src/utils/docfu.js'
import {buildSidebar} from './src/utils/sidebar.js'

const workspace = getWorkspace()
const config = loadConfig(workspace)
const manifest = loadManifest(workspace)
const name = config.site?.name || 'Documentation'
const site = config.site?.url || 'https://example.com'
const theme = config.site?.theme || 'nova'
const sidebar = buildSidebar(manifest, config)
const userComponents = manifest.components?.items || []
const components = getStarlightOverrides(userComponents)

// Map theme names to their plugin functions
const themes = {
  nova: starlightThemeNova(),
  starlight: null,
}

// Build customCss array: DocFu base styles + auto-discovered CSS from assets/
const userCss = (manifest.css?.items || []).map(item => `${workspace}/${item.path}`)
const customCss = ['./src/styles/docfu.css', ...userCss]

export default defineConfig({
  root: process.env.DOCFU_ENGINE || '.',
  outDir: process.env.DOCFU_DIST || '.docfu/dist',
  cacheDir: `${workspace}/.astro`,
  site,
  trailingSlash: 'never',

  // Store Vite cache in workspace to avoid conflicts when node_modules is symlinked (npx compatibility)
  vite: {
    cacheDir: `${workspace}/.vite`,
  },

  // Integration order matters: Astro processes sequentially (preprocessors → processors → renderers)
  integrations: [
    // Preprocesses .md code blocks to <pre class="mermaid"> before Starlight
    mermaid(),

    // Processes .md files (already mermaid-preprocessed), provides theme/components/Expressive Code
    starlight({
      title: name,
      head: [
        {
          tag: 'script',
          attrs: {
            src: '/scripts/external-links.js',
            type: 'module',
          },
        },
      ],
      sidebar,
      components,
      expressiveCode: {},
      customCss,
      plugins: [
        starlightGithubAlerts(),
        starlightHeadingBadges(),
        starlightLlmsTxt({projectName: name}),
        themes[theme],
      ].filter(Boolean),
    }),

    // Handles .mdoc files separately (bypasses mermaid, uses custom Fence component for diagrams)
    markdoc({allowHTML: true}),
  ],
})
