import {defineCollection} from 'astro:content'
import {glob} from 'astro/loaders'
import {docsSchema} from '@astrojs/starlight/schema'

export const collections = {
  docs: defineCollection({
    loader: glob({
      pattern: '**/*.{md,mdx,mdoc}',
      base: './src/content/docs',
    }),
    schema: docsSchema(),
  }),
}
