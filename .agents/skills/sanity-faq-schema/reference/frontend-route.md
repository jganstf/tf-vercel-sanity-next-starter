# FAQ Frontend Route + Queries

Reference implementation for a Next.js App Router frontend using `next-sanity`. Adapt import
paths (`@/app/components/PortableText`, `@/sanity/lib/live`, `@/sanity/lib/utils`) and reused
helpers (`sanityFetch`, `resolveOpenGraphImage`, `PortableText`) to the target project's
existing conventions — these names come from a project that already has a `post`/`page` content
model following the standard `sanity-io/sanity-template-nextjs-clean` layout.

## GROQ queries (`frontend/sanity/lib/queries.ts`)

```typescript
export const faqSettingsQuery = defineQuery(`*[_type == "faqSettings"][0]{
  title,
  intro,
  defaultSeo,
}`)

// Resolves a faqCategory's own nested parent chain up to 5 levels deep.
// GROQ has no native arbitrary recursion, so this is a practical bound
// rather than a guarantee of arbitrary depth. Add more parent-> hops here
// if the project needs deeper category nesting.
const faqCategoryPath = /* groq */ `
  "pathSegments": [
    parent->parent->parent->parent->slug.current,
    parent->parent->parent->slug.current,
    parent->parent->slug.current,
    parent->slug.current,
    slug.current
  ][defined(@)]
`

export const faqCategoryTreeQuery = defineQuery(`
  *[_type == "faqCategory" && defined(slug.current)]{
    _id,
    title,
    ${faqCategoryPath}
  }
`)

export const faqPagesSlugs = defineQuery(`
  *[_type == "faq" && defined(slug.current) && defined(category->slug.current)]{
    "path": [
      ...category->{${faqCategoryPath}}.pathSegments,
      slug.current
    ]
  }
`)

export const faqQuery = defineQuery(`
  *[_type == "faq" && slug.current == $slug && category->slug.current == $categorySlug][0]{
    _id,
    question,
    shortAnswer,
    longAnswer,
    seo,
    "category": category->{
      title,
      ${faqCategoryPath}
    },
  }
`)

export const faqsByCategoryQuery = defineQuery(`
  *[_type == "faq" && category->slug.current == $categorySlug] | order(question asc){
    question,
    shortAnswer,
    "slug": slug.current,
  }
`)
```

After adding these, regenerate types (adjust to the project's actual script names):
`npm run sanity:typegen` (schema extract + `sanity typegen generate`).

## Route (`frontend/app/faq/[...path]/page.tsx`)

```tsx
import type {Metadata, ResolvingMetadata} from 'next'
import {notFound} from 'next/navigation'
import {type PortableTextBlock} from 'next-sanity'

import PortableText from '@/app/components/PortableText'
import {sanityFetch} from '@/sanity/lib/live'
import {
  faqCategoryTreeQuery,
  faqPagesSlugs,
  faqQuery,
  faqSettingsQuery,
  faqsByCategoryQuery,
} from '@/sanity/lib/queries'
import {resolveOpenGraphImage} from '@/sanity/lib/utils'

/**
 * Generate static params for every FAQ (full nested category path + faq slug)
 * and every FAQ category (its own nested path, for index pages).
 */
export async function generateStaticParams() {
  const [{data: faqSlugs}, {data: categories}] = await Promise.all([
    sanityFetch({query: faqPagesSlugs, perspective: 'published', stega: false}),
    sanityFetch({query: faqCategoryTreeQuery, perspective: 'published', stega: false}),
  ])

  const faqParams = faqSlugs.map((faq) => ({path: faq.path}))
  const categoryParams = categories.map((category) => ({path: category.pathSegments}))

  return [...faqParams, ...categoryParams]
}

async function resolveFaqPath(path: string[]) {
  const categorySlug = path[path.length - 2]
  const faqSlug = path[path.length - 1]

  if (!categorySlug) return null

  const {data: faq} = await sanityFetch({
    query: faqQuery,
    params: {slug: faqSlug, categorySlug},
    stega: false,
  })

  if (!faq?._id) return null
  if (faq.category?.pathSegments?.join('/') !== path.slice(0, -1).join('/')) return null

  return faq
}

export async function generateMetadata(
  props: PageProps<'/faq/[...path]'>,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await props.params
  const [faq, {data: faqSettings}] = await Promise.all([
    resolveFaqPath(params.path),
    sanityFetch({query: faqSettingsQuery, stega: false}),
  ])

  const previousImages = (await parent).openGraph?.images || []
  const seo = faq?.seo ?? faqSettings?.defaultSeo
  const ogImage = resolveOpenGraphImage(seo?.ogImage)

  return {
    title: seo?.metaTitle ?? faq?.question,
    description: seo?.metaDescription ?? faq?.shortAnswer,
    openGraph: {
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
    },
  } satisfies Metadata
}

export default async function FaqPage(props: PageProps<'/faq/[...path]'>) {
  const params = await props.params
  const faq = await resolveFaqPath(params.path)

  if (faq) {
    return (
      <div className="container my-12 lg:my-24 grid gap-6 max-w-3xl">
        <h1 className="text-4xl text-gray-900 sm:text-5xl">{faq.question}</h1>
        <p className="text-lg text-gray-700">{faq.shortAnswer}</p>
        {faq.longAnswer?.length ? (
          <PortableText
            className="max-w-2xl prose-headings:font-medium prose-headings:tracking-tight"
            value={faq.longAnswer as PortableTextBlock[]}
          />
        ) : null}
      </div>
    )
  }

  // Not a single FAQ - try resolving as a category index page instead.
  const categorySlug = params.path[params.path.length - 1]
  const {data: categories} = await sanityFetch({query: faqCategoryTreeQuery, stega: false})
  const category = categories.find(
    (candidate) => candidate.pathSegments?.join('/') === params.path.join('/'),
  )

  if (!category) {
    return notFound()
  }

  const {data: faqs} = await sanityFetch({
    query: faqsByCategoryQuery,
    params: {categorySlug},
  })

  return (
    <div className="container my-12 lg:my-24 grid gap-6 max-w-3xl">
      <h1 className="text-4xl text-gray-900 sm:text-5xl">{category.title}</h1>
      <ul className="grid gap-4">
        {faqs.map((item) => (
          <li key={item.slug}>
            <a href={`/faq/${[...params.path, item.slug].join('/')}`} className="underline">
              {item.question}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

After adding the route, regenerate Next.js's route param types (`next typegen`) so
`PageProps<'/faq/[...path]'>` resolves.
