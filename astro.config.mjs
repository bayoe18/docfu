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
import {loadConfig, loadManifest} from './src/utils/docfu.js'
import {buildSidebar} from './src/utils/sidebar.js'

// Load manifest from DOCFU_ROOT/manifest.json
const manifest = loadManifest()
const config = manifest.config || {}
const name = config.site?.name || 'Documentation'
const site = config.site?.url || 'https://example.com'
const theme = config.site?.theme || 'nova'
const sidebar = buildSidebar(manifest, config)
const userComponents = manifest.components?.items || []
const components = getStarlightOverrides(userComponents)

const themes = {
  nova: starlightThemeNova(),
  starlight: null,
}

// Build customCss array: DocFu base styles + auto-discovered CSS from public/
const userCss = (manifest.css?.items || []).map(item => `./public/${item.path}`)
const customCss = ['./src/styles/docfu.css', ...userCss]

export default defineConfig({
  outDir: '../dist',
  cacheDir: '.astro',
  site,
  trailingSlash: 'never',

  vite: {
    cacheDir: '.vite',
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
