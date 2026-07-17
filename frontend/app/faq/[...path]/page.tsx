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
