import {defineCollection} from 'astro:content'
import {glob} from 'astro/loaders'
import {docsSchema} from '@astrojs/starlight/schema'

const workspaceRoot = process.env.DOCFU_WORKSPACE || '.docfu/workspace'

export const collections = {
  docs: defineCollection({
    // Use glob loader to load from workspace root directly
    // Pattern matches all .md/.mdx/.mdoc files, excluding build artifacts
    loader: glob({
      pattern: '**/*.{md,mdx,mdoc}',
      base: workspaceRoot,
    }),
    schema: docsSchema(),
  }),
}
