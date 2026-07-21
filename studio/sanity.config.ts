/**
 * This config is used to configure your Sanity Studio.
 * Learn more: https://www.sanity.io/docs/configuration
 */

import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './src/schemaTypes'
import {structure} from './src/structure'
import {unsplashImageAsset} from 'sanity-plugin-asset-source-unsplash'
import {media} from 'sanity-plugin-media'
import {
  presentationTool,
  defineDocuments,
  defineLocations,
  type DocumentLocation,
} from 'sanity/presentation'
import {assist} from '@sanity/assist'

// Environment variables for project configuration
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'your-projectID'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

// URL for preview functionality, defaults to localhost:3000 if not set
const SANITY_STUDIO_PREVIEW_URL = process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:3000'

// Define the home location for the presentation tool
const homeLocation = {
  title: 'Home',
  href: '/',
} satisfies DocumentLocation

// Builds the full nested URL path for a page by walking up to 4 levels of `parent` references,
// e.g. a page nested two levels deep resolves to "grandparent/parent/child". Kept in sync with
// the equivalent fragment in frontend/sanity/lib/queries.ts.
const pagePathExpr = /* groq */ `
  array::join(
    [
      parent->parent->parent->parent->slug.current,
      parent->parent->parent->slug.current,
      parent->parent->slug.current,
      parent->slug.current,
      slug.current
    ][defined(@)],
    "/"
  )
`

// resolveHref() is a convenience function that resolves the URL
// path for different document types and used in the presentation tool.
function resolveHref(documentType?: string, slug?: string): string | undefined {
  switch (documentType) {
    case 'post':
      return slug ? `/posts/${slug}` : undefined
    case 'page':
      // `slug` here is the full nested path (e.g. "parent/child"), not just the page's own slug segment.
      return slug ? `/${slug}` : undefined
    default:
      console.warn('Invalid document type:', documentType)
      return undefined
  }
}

// Main Sanity configuration
export default defineConfig({
  name: 'default',
  title: 'TF Starter Template',

  projectId,
  dataset,

  plugins: [
    // Presentation tool configuration for Visual Editing
    presentationTool({
      previewUrl: {
        origin: SANITY_STUDIO_PREVIEW_URL,
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
      resolve: {
        // The Main Document Resolver API provides a method of resolving a main document from a given route or route pattern. https://www.sanity.io/docs/visual-editing/presentation-resolver-api#57720a5678d9
        mainDocuments: defineDocuments([
          {
            route: '/',
            filter: `_type == "settings" && _id == "siteSettings"`,
          },
          {
            route: '/:slug*',
            filter: `_type == "page" && (${pagePathExpr}) == array::join($slug, "/") || _id == array::join($slug, "/")`,
          },
          {
            route: '/posts/:slug',
            filter: `_type == "post" && slug.current == $slug || _id == $slug`,
          },
        ]),
        // Locations Resolver API allows you to define where data is being used in your application. https://www.sanity.io/docs/visual-editing/presentation-resolver-api#8d8bca7bfcd7
        locations: {
          settings: defineLocations({
            locations: [homeLocation],
            message: 'This document is used on all pages',
            tone: 'positive',
          }),
          page: defineLocations({
            select: {
              title: 'title',
              slug: 'slug.current',
              parentSlug: 'parent.slug.current',
              grandparentSlug: 'parent.parent.slug.current',
              greatGrandparentSlug: 'parent.parent.parent.slug.current',
            },
            resolve: (doc) => {
              const path = [
                doc?.greatGrandparentSlug,
                doc?.grandparentSlug,
                doc?.parentSlug,
                doc?.slug,
              ]
                .filter(Boolean)
                .join('/')

              return {
                locations: [
                  {
                    title: doc?.title || 'Untitled',
                    href: resolveHref('page', path)!,
                  },
                ],
              }
            },
          }),
          post: defineLocations({
            select: {
              title: 'title',
              slug: 'slug.current',
            },
            resolve: (doc) => ({
              locations: [
                {
                  title: doc?.title || 'Untitled',
                  href: resolveHref('post', doc?.slug)!,
                },
                {
                  title: 'Home',
                  href: '/',
                } satisfies DocumentLocation,
              ].filter(Boolean) as DocumentLocation[],
            }),
          }),
        },
      },
    }),
    structureTool({
      structure, // Custom studio structure configuration, imported from ./src/structure.ts
    }),
    // Additional plugins for enhanced functionality
    unsplashImageAsset(),
    media(),
    assist(),
    visionTool(),
  ],

  // Form submissions are authored only by the website's submit action.
  // Keep them out of the global "＋ Create" menu and strip create/edit actions;
  // combined with `readOnly: true` on the schema, editors can browse but not author.
  document: {
    newDocumentOptions: (prev) => prev.filter((template) => template.templateId !== 'formSubmission'),
    actions: (prev, {schemaType}) =>
      schemaType === 'formSubmission'
        ? prev.filter(({action}) => action === 'delete')
        : prev,
  },

  // Schema configuration, imported from ./src/schemaTypes/index.ts
  schema: {
    types: schemaTypes,
  },
})
