# 📚 Welcome to DocFu

**The easiest way to turn your existing markdown into a professional website.**

Just run it on your existing markdown project.

```sh
npx docfu build /path/to/markdown
```

**That's it!** You now have a beautiful static site ready for deployment.

## Why DocFu?

DocFu is the only static site generator that combines professional documentation features with zero required setup and is entirely [CLI](https://en.wikipedia.org/wiki/Command-line_interface) driven.

- ✓ Works instantly with your existing markdown - no setup required
- ✓ Multi-format support: Markdown, MDX, and Markdoc work seamlessly together
- ✓ Zero-config components: Built-in + custom components work everywhere, no imports needed
- ✓ Themeable: 2 professional themes included (more coming soon)
- ✓ Live preview with watch mode for instant feedback
- ✓ Professional features: Full-text search, dark mode, responsive design
- ✓ Static output that deploys anywhere

> [!TIP]
> Docfu works out-of-the-box with sensible defaults and can be easily customized.

## Who's It For?

**Anyone** who wants painless and feature-rich documentation without the overhead of maintaining a JavaScript
project and build system for their documentation site.

_e.g. Product Teams, Technical Writers, etc._

---

<p align="center">
  <strong>Brought to you by</strong>
</p>

<p align="center">
  <a href="https://www.rxvortex.com/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://ik.imagekit.io/hopsoft/Logos/rxvortex-logo-dark_XFLGrdJ9G.svg?updatedAt=1759900258711">
      <source media="(prefers-color-scheme: light)" srcset="https://ik.imagekit.io/hopsoft/Logos/rxvortex-logo-light_UWRG2SGSi.svg?updatedAt=1759900258750">
      <img alt="RxVortex Logo" src="https://ik.imagekit.io/hopsoft/Logos/rxvortex-logo-light_UWRG2SGSi.svg?updatedAt=1759900258750" width="240" height="38.4">
    </picture>
  </a>
</p>

<p align="center">
  Advancing Healthcare. Defining Tomorrow.
</p>

---

## Prerequisites

- [node](https://nodejs.org/) `>=20`
- [npm](https://www.npmjs.com/) `>=10`

## Table of Contents

<!-- toc -->

- [What's Included?](#whats-included)
- [Components](#components)
- [Content Authoring](#content-authoring)
- [Customization](#customization)
- [Command Line Interface](#command-line-interface)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)
- [Similar Projects](#similar-projects)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

<!-- tocstop -->

## What's Included?

- **Breadcrumbs:** Track your location with automatic breadcrumb trails
- **Full-Text Search:** Search across all pages instantly
- **LLM-Friendly:** Generate `/llms.txt` files automatically for [AI supported docs](https://llmstxt.org/)
- **Light/Dark Mode:** Switch between light and dark themes automatically
- **MDX:** Use `.mdx` files or MDX syntax in Markdown files
- **Markdoc:** Use `.mdoc` files or Markdoc syntax in Markdown files
- **Navigation:** Move between pages with automatic prev/next links
- **Partials:** Use MDX imports or Markdoc partials to share content across pages
- **README Support:** Use README.md files as index pages automatically
- **Responsive Design:** Access on any device with mobile-first responsive design
- **Sidebar:** Navigate with automatic sidebars built from your file structure
- **Syntax Highlighting:** Highlight code blocks automatically with VS Code themes
- **Table of Contents:** Navigate page sections with automatic right-sidebar TOC
- **Themes:** Choose from 2 professional themes - Nova (modern) or Starlight (classic)

> [!IMPORTANT]
>
> Your project can contain a mix of `.md`, `.mdx`, and `.mdoc` files,
> but each file must use a single syntax: MDX or Markdoc (not both).

## Components

> [!NOTE]
>
> - ✓ No setup or imports required
> - ✓ MDX or Markdoc syntax supported
> - ✓ Use in any markdown file

### Built-in Components

1. <details>
   <summary><strong>Aside</strong> (alerts/callouts)</summary>

   Highlight important information with callout boxes. Choose from different types to convey the right tone.
   [Read the docs](https://starlight.astro.build/components/asides/)

   **MDX:**

   ```markdown
   <Aside>
    Helpful information for users to know.
   </Aside>
   ```

   **Markdoc:**

   ```markdown
   {% aside %}
   Helpful information for users to know.
   {% /aside %}
   ```

   </details>

2. <details>
   <summary><strong>Badge</strong> (inline labels)</summary>

   Display inline labels for status, versions, or other metadata. Perfect for highlighting new features or changes.
   [Read the docs](https://starlight.astro.build/components/badges/)

   **MDX:**

   ```markdown
   <Badge text="New" variant="tip" />
   ```

   **Markdoc:**

   ```markdown
   {% badge text="New" variant="tip" /%}
   ```

   **Heading Badges:** Use `:badge[text]` syntax for badges in headings

   ```markdown
   ## New Feature :badge[Beta]

   ### API Changes :badge[Breaking]{variant="danger"}
   ```

   </details>

3. <details>
   <summary><strong>Card/CardGrid</strong> (highlighted content blocks)</summary>

   Showcase content in highlighted containers. Use CardGrid to arrange multiple cards in a responsive layout.
   [Read the docs](https://starlight.astro.build/components/cards/)

   **MDX:**

   ```markdown
   <Card title="Check this out">
     Interesting content you want to highlight.
   </Card>
   ```

   **Markdoc:**

   ```markdown
   {% card title="Check this out" %}
   Interesting content you want to highlight.
   {% /card %}
   ```

   </details>

4. <details>
   <summary><strong>Code</strong> (copyable syntax-highlighted code blocks)</summary>

   Display code snippets with syntax highlighting and a copy-to-clipboard button.
   [Read the docs](https://starlight.astro.build/components/code/)

   **MDX:**

   ```markdown
   <Code code="const hello = 'world';" lang="js" />
   ```

   **Markdoc:**

   ```markdown
   {% code code="const hello = 'world';" lang="js" /%}
   ```

   **Standard code fence support**

   ````markdown
   ```js
   function greet(name) {
     return `Hello, ${name}!`
   }
   ```
   ````

   **Mermaid diagram support**

   Standard mermaid code blocks work in all formats:

   ````markdown
   ```mermaid
   graph TD
     A[Start] --> B[Process]
     B --> C[End]
   ```
   ````

   You can also use the `Fence` component for explicit control:

   **MDX:**

   ```markdown
   <Fence code={`graph TD
     A[Start] --> B[Process]
     B --> C[End]`} lang="mermaid" />
   ```

   **Markdoc:**

   ```markdown
   {% fence code=`graph TD
     A[Start] --> B[Process]
     B --> C[End]` lang="mermaid" /%}
   ```

   </details>

5. <details>
   <summary><strong>FileTree</strong> (file/folder structure)</summary>

   Visualize directory structures and file hierarchies with an intuitive tree diagram.
   [Read the docs](https://starlight.astro.build/components/file-tree/)

   **MDX:**

   ```markdown
   <FileTree>

   - src/
     - components/
       - Button.jsx
     - pages/
       - index.astro

   </FileTree>
   ```

   **Markdoc:**

   ```markdown
   {% filetree %}

   - src/
     - components/
       - Button.jsx
     - pages/
       - index.astro

   {% /filetree %}
   ```

   </details>

6. <details>
   <summary><strong>Icon</strong> (built-in icon library)</summary>

   Add icons from Starlight's built-in icon library to enhance visual communication.
   [Read the docs](https://starlight.astro.build/components/icons/)

   **Block icons (standalone):**

   **MDX:**

   ```markdown
   <Icon name="star" />
   ```

   **Markdoc:**

   ```markdown
   {% icon name="star" /%}
   ```

   **Inline icons (within text):**

   Use `class="inline"` to display icons inline with text flow.

   **MDX:**

   ```markdown
   This is text with an inline icon <Icon name="star" class="inline" /> in the middle.
   ```

   **Markdoc:**

   ```markdown
   This is text with an inline icon {% icon name="star" class="inline" /%} in the middle.
   ```

   </details>

7. <details>
   <summary><strong>LinkButton</strong> (call to action)</summary>

   Create prominent call-to-action buttons that link to other pages or external resources.
   [Read the docs](https://starlight.astro.build/components/link-buttons/)

   **MDX:**

   ```markdown
   <LinkButton href="/guides/getting-started/">Get Started</LinkButton>
   ```

   **Markdoc:**

   ```markdown
   {% linkbutton href="/guides/getting-started/" %}Get Started{% /linkbutton %}
   ```

   </details>

8. <details>
   <summary><strong>LinkCard</strong> (clickable cards)</summary>

   Display links as attractive cards with titles and optional descriptions.
   [Read the docs](https://starlight.astro.build/components/link-cards/)

   **MDX:**

   ```markdown
   <LinkCard title="Authoring Markdown" href="/guides/authoring-content/" />
   ```

   **Markdoc:**

   ```markdown
   {% linkcard title="Authoring Markdown" href="/guides/authoring-content/" /%}
   ```

   </details>

9. <details>
   <summary><strong>Steps</strong> (step-by-step instructions)</summary>

   Present sequential instructions with automatic numbering and styled formatting.
   [Read the docs](https://starlight.astro.build/components/steps/)

   **MDX:**

   ```markdown
   <Steps>

   1. First step
   2. Second step
   3. Third step

   </Steps>
   ```

   **Markdoc:**

   ```markdown
   {% steps %}

   1. First step
   2. Second step
   3. Third step

   {% /steps %}
   ```

   </details>

10. <details>
    <summary><strong>Tabs/TabItem</strong> (tabbed content sections)</summary>

    Organize related content into tabbed sections, ideal for showing multiple code examples or platform-specific instructions.
    [Read the docs](https://starlight.astro.build/components/tabs/)

    **MDX:**

    ```markdown
    <Tabs>
      <TabItem label="npm">
        npm install package
      </TabItem>
      <TabItem label="yarn">
        yarn add package
      </TabItem>
    </Tabs>
    ```

    **Markdoc:**

    ```markdown
    {% tabs %}
    {% tabitem label="npm" %}
    npm install package
    {% /tabitem %}
    {% tabitem label="yarn" %}
    yarn add package
    {% /tabitem %}
    {% /tabs %}
    ```

    </details>

### Custom Components

DocFu also supports custom components. Create them in a `components/` directory:

> [!NOTE]
>
> - ✓ Automatically registered, imported, and ready for use
> - ✓ New attributes automatically supported
> - ✓ Use in any markdown file
> - ✓ The default components directory is `components` but can be configured in `docfu.yml`

#### Define the Component

`components/InfoCard.astro`

```astro
---
const {title, type = 'info'} = Astro.props
---
<div class={`info-card info-card-${type}`}>
  <h3>{title}</h3>
  <slot />
</div>
```

#### Use the Component

**MDX:**

```markdown
<InfoCard title="Quick Tip" type="success">
  Components are automatically imported - just use them!
</InfoCard>
```

**Markdoc:**

```markdown
{% infocard title="Quick Tip" type="success" %}
This works seamlessly with Markdoc syntax!
{% /infocard %}
```

### Component Overrides

Replace Starlight's built-in components with your own by creating components with the same name.

#### Define the Component

`components/Header.astro`

```astro
<header class="custom-header">
  <h1>My Custom Documentation</h1>
  <nav><!-- custom navigation --></nav>
</header>
```

_See usage examples above._

**That's it!** Your `Header` now overrides the default built-in component. No imports or configuration needed.

## Content Authoring

Enhanced authoring features available everywhere - zero configuration.

- <details><summary><strong>Assets</strong> (images, etc)</summary>

  Use local files and images with relative paths - automatically bundled into the final site.

  > [!NOTE]
  > The default assets directory is `assets` but can be configured in `docfu.yml`.

  ```markdown
  ![Logo](assets/images/logo.png)
  ```

  </details>

- <details><summary><strong>Collapsible Sections</strong> (styled expandable sections)</summary>

  Hide optional or detailed content behind expandable sections to keep pages scannable while preserving depth.

  ```markdown
  <details>
    <summary>Click to expand</summary>
    Additional content goes here.
  </details>
  ```

  </details>

- <details><summary><strong>GitHub Alerts</strong> (styled callout boxes)</summary>

  Draw attention to important information with styled callout boxes for notes, warnings, tips, and cautions. Uses familiar [GitHub alert syntax](https://github.com/orgs/community/discussions/16925).

  ```markdown
  > [!NOTE]
  > Helpful information for users to know.
  ```

  </details>

- <details><summary><strong>Partials</strong> (reusable content)</summary>

  Share common content like disclaimers, license text, or repeated sections across multiple pages to maintain consistency.

  **MDX:**

  ```markdown
  import SharedContent from './path/to/partial.mdx'

  <SharedContent />
  ```

  **Markdoc:**

  ```markdown
  {% partial file="path/to/partial.md" /%}
  ```

  </details>

## Customization

Run `npx docfu init` or create the `docfu.yml` config file in your markdown project.
See [docfu.example.yml](docfu.example.yml) for details.

### Theme Selection

Choose between professional themes to match your documentation style.

<details>
<summary>Example configuration</summary>

```yaml
site:
  name: My Documentation
  url: https://docs.example.com
  theme: nova # 'nova' (default, modern) or 'starlight' (classic)
```

**Available themes:**

- **nova** (default) - Modern, polished theme with enhanced visual design
- **starlight** - Classic Starlight theme with clean, minimal aesthetic

More themes coming soon!

</details>

### Custom Styling

Customize colors, fonts, layout, and more with CSS files—automatically discovered and loaded.

<details>
<summary>How it works</summary>

**Zero configuration required!** Just place `.css` files in your `assets/` directory and they're automatically loaded.

Create `assets/styles/custom.css` in your docs:

```css
/* Override Starlight CSS variables */
:root {
  --sl-color-accent: #ff6b6b;
  --sl-font: 'Inter', sans-serif;
}

/* Custom element styles */
.sl-markdown-content h1 {
  color: var(--sl-color-accent);
}
```

**Load order:**

- CSS files load alphabetically after DocFu's base styles
- Your styles take precedence and can override defaults
- Use numeric prefixes for explicit ordering: `01-base.css`, `02-theme.css`

**Example structure:**

```
docs/
└── assets/
    ├── images/
    │   └── logo.png
    └── styles/
        ├── custom.css
        └── brand.css
```

All CSS files under `assets/` are discovered automatically!

</details>

### File Exclusion

Control which files are processed and indexed.

<details>
<summary>Example configuration</summary>

```yaml
# Completely exclude from processing
exclude:
  - '*.tmp.md'
  - CONTRIBUTING.md
  - archive

# Build but exclude from search
unlisted:
  - drafts
  - 'internal/**'
  - 'wip-*.md'
```

- **exclude**: Files never processed or built
- **unlisted**: Files built and accessible, but hidden from search

</details>

### Custom Sidebar

Customize navigation structure instead of using auto-generated sidebar.

<details>
<summary>Example configuration</summary>

```yaml
sidebar:
  - file: index.md
    label: Home
  - group: Guides
    items:
      - quickstart.md
      - installation.md
  - group: API
    directory: api/ # Auto-generate from directory
```

</details>

### Hierarchical Configuration

Place `docfu.yml` files in subdirectories for granular control.

<details>
<summary>Example structure</summary>

```
docs/
├── docfu.yml           # Root config (site info)
├── guides/
│   └── docfu.yml       # Guides-specific config
└── api/
    └── docfu.yml       # API-specific config
```

Configs cascade naturally - subdirectory configs override parent configs for their scope.

</details>

## Command Line Interface

### Configure Your Project

```bash
npx docfu init /path/to/markdown
```

- **What it does:** Creates a `docfu.yml` configuration file in your markdown project
- **When to use:** Whenever you want to customize

### Build Your Site

```bash
npx docfu build /path/to/markdown
```

- **What it does:** Converts your markdown project into a beautiful static website
- **When to use:** Building for deployment or testing final output

### Preview Your Site

```bash
npx docfu preview /path/to/markdown
```

- **What it does:** Builds your website and hosts it locally
- **When to use:** Local testing before deployment

### Command Reference

```bash
npx docfu --help

Usage: docfu [options] <source>

Generate production-ready documentation websites from markdown

Options:
  -h, --help                  display help for command
  -v, --version               output version number

Commands:
  init [options] [source]     Initialize DocFu configuration
  prepare [options] <source>  Prepare documents for build
  build [options] <source>    Build documentation site (default)
  preview [options] <source>  Preview documentation site locally
  help [command]              display help for command

Examples:
  $ docfu ./docs
  $ docfu prepare ./docs
  $ docfu preview ./my-docs --port 3000

Environment Variables:
  DOCFU_SOURCE      Source markdown directory
  DOCFU_WORKSPACE   Workspace directory (default: .docfu/workspace)
  DOCFU_DIST        Build output directory (default: .docfu/dist)
```

## Environment Variables

Override default paths using environment variables.

- **DOCFU_SOURCE** - Source markdown directory
- **DOCFU_WORKSPACE** - Temporary workspace where markdown is processed before building (default: `.docfu/workspace`)
- **DOCFU_DIST** - Build output directory for the final static site (default: `.docfu/dist`)

## Troubleshooting

### Links Not Working

Use relative paths in markdown links.

- ✓ `[Guide](./guides/intro.md)`
- ✗ `[Guide](/guides/intro.md)`

### Images Not Displaying

Place images in `assets/` directory and use relative paths.

- ✓ From Root: `![Logo](assets/images/logo.png)`
- ✓ From Subdir: `![Logo](../assets/images/logo.png)`
- ✗ `![Logo](/assets/images/logo.png)`

### Inspect Pre-Processed Markdown

The workspace contains your prepared (pre-processed) markdown files with all transformations applied before building.
Inspecting these files helps diagnose issues with syntax detection, component imports, or file conversions.

**What you'll find in the workspace:**

- File conversions (based on content/context)
  - `README.md` → `index.md`
  - `.md` → `.mdx`
  - `.md` → `.mdoc`
- Auto-enhanced frontmatter
- Auto-generated component imports for MDX files
- Updated partial references for Markdoc files

**How to inspect:**

```bash
npx docfu prepare /path/to/markdown
ls -la /path/to/markdown/.docfu/workspace/
```

**Common troubleshooting scenarios:**

- **Components not rendering?** Check if MDX files have the expected imports
- **Wrong file extension?** Verify `.md` files were converted to `.mdx` or `.mdoc` correctly
- **Partials not working?** Inspect partial file references and paths in the workspace
- **Frontmatter issues?** Review processed frontmatter in workspace files

## Similar Projects

### Documentation-Specific Generators

**Requires Project Setup / Restructuring:**

These tools require creating a project with config files, specific folder structures, or restructuring your existing markdown:

- [Astro](https://astro.build/) - Full Astro project setup with config and build pipeline
- [Docusaurus](https://docusaurus.io/) - React project, docusaurus.config.js, sidebars.js, specific folder structure
- [Eleventy](https://www.11ty.dev/) - Node project, .eleventy.js config, template directories
- [Hugo](https://gohugo.io/) - Go-based, config.toml, content/ structure, template learning curve
- [Jekyll](https://jekyllrb.com/) - Ruby project, \_config.yml, \_posts/ structure, Gemfile
- [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) - MkDocs with theme, requires same setup
- [MkDocs](https://www.mkdocs.org/) - Python, mkdocs.yml config, docs/ folder structure
- [Nextra](https://nextra.site/) - Next.js project, \_meta.js files, pages/ directory structure
- [Slate](https://slatedocs.github.io/slate/) - Ruby/Middleman project, config.rb
- [Sphinx](https://www.sphinx-doc.org/) - Python, conf.py config, reStructuredText format
- [Starlight](https://starlight.astro.build/)\* - Full Astro project, astro.config.mjs, src/content/docs/ structure
- [VitePress](https://vitepress.dev/) - Node project, .vitepress/config.js, src/ directory structure
- [VuePress](https://vuepress.vuejs.org/) - Node project, .vuepress/config.js, specific folder conventions

**Runtime/Browser Rendered (Not Static):**

- [Docsify](https://docsify.js.org/) - Renders markdown in browser at runtime, requires JavaScript enabled, no pre-built HTML
- [Docute](https://docute.egoist.dev/) - Vue-based SPA, fetches and renders markdown on the fly, no build step

**Others:**

See [Awesome Static Generators](https://github.com/myles/awesome-static-generators) for hundreds more (all require project setup).

### Why Choose DocFu?

Most tools force you to choose: simple setup OR rich features. DocFu gives you both.

1. **CLI-driven simplicity** - No setup or complex project to manage
2. **Works with existing repos** - No restructuring, config files, or source modifications required
3. **Multi-format support** - MD, MDX, and Markdoc work seamlessly together
4. **Zero-config components** - Built-in + custom components work everywhere, no imports needed
5. **Live preview with watch mode** - Instant feedback while writing
6. **Professional features** - Full Starlight component library, search, themes, dark mode, responsive design
7. **Isolated workspace** - Source stays pristine, builds with separate `.docfu/` directory
8. **True static output** - Deploy anywhere (vs runtime rendering like Docsify)

**Why DocFu over Starlight?** Starlight requires creating an Astro project with package.json, node_modules, and config files in your documentation repository. DocFu gives you all of Starlight's features without polluting your docs project: just point it at your existing markdown and build.

## Tech Stack

- [Astro](https://astro.build/) - Static site generator
- [MDX](https://mdxjs.com/) - Markdown with JSX components
- [Markdoc](https://markdoc.dev/) - Structured content with partials
- [Mermaid](https://mermaid.js.org/) - Diagram rendering
- [Pagefind](https://pagefind.app/) - Static search
- [Sharp](https://sharp.pixelplumbing.com/) - Image optimization
- [Shiki](https://shiki.matsu.io/) - Syntax highlighting
- [Starlight GitHub Alerts](https://github.com/HiDeoo/starlight-github-alerts) - GitHub alert syntax support
- [Starlight Heading Badges](https://starlight-heading-badges.vercel.app/) - Heading badge support
- [Starlight LLMs.txt](https://delucis.github.io/starlight-llms-txt/) - AI-friendly documentation generation
- [Starlight](https://starlight.astro.build/) - Documentation theme

## Contributing

Contributions welcome! Fork the repo, make your changes, and open a pull request.

```bash
git clone https://github.com/hopsoft/docfu.git
cd docfu
npm install
npm test
```

<details>
<summary>Deployment</summary>

Publishing new versions to npm requires the following steps.

1. Format and test

   ```bash
   npm run format
   npm run test
   ```

2. Commit changes

3. Update version

   ```bash
   # For bug fixes
   npm version patch

   # For new features (backward compatible)
   npm version minor

   # For breaking changes
   npm version major
   ```

   _This updates `package.json` and creates a git tag automatically._

   Alt (manual tag)

   ```bash
   # First: Update version in package.json and commit
   git tag -a vX.X.X -m "Release vX.X.X"
   ```

4. Push changes and tags

   ```bash
   git push [REMOTE] && git push --tags [REMOTE]
   ```

5. Publish to npm

   ```bash
   npm publish
   ```

6. Create GitHub release (optional)

   Visit the [releases page](https://github.com/hopsoft/docfu/releases) and create a new release from the version tag with release notes.

</details>

## License

[MIT](LICENSE)
