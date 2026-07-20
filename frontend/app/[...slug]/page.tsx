import type {Metadata, ResolvingMetadata} from 'next'
import Head from 'next/head'

import PageBuilderPage from '@/components/PageBuilder'
import {sanityFetch} from '@/sanity/lib/live'
import {getPageQuery, pagesSlugs} from '@/sanity/lib/queries'
import {GetPageQueryResult} from '@/sanity.types'
import {PageOnboarding} from '@/components/Onboarding'
import {resolveOpenGraphImage} from '@/sanity/lib/utils'
import { notFound } from 'next/navigation'

/**
 * Generate the static params for the page, including nested pages.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
 */
export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: pagesSlugs,
    // // Use the published perspective in generateStaticParams
    perspective: 'published',
    stega: false,
  })
  return data.filter((page) => page.path).map((page) => ({slug: page.path!.split('/')}))
}

/**
 * Generate metadata for the page.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#generatemetadata-function
 */
export async function generateMetadata(
  props: PageProps<'/[...slug]'>,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const params = await props.params
  const {data: page} = await sanityFetch({
    query: getPageQuery,
    params: {slug: params.slug.join('/')},
    // Metadata should never contain stega
    stega: false,
  })

  const previousImages = (await parent).openGraph?.images || []
  const ogImage = resolveOpenGraphImage(page?.seo?.image)

  return {
    title: page?.seo?.title,
    description: page?.seo?.description,
    openGraph: {
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
    },
    robots: page?.seo?.noIndex ? {index: false, follow: false} : undefined,
  } satisfies Metadata
}

export default async function Page(props: PageProps<'/[...slug]'>) {
  const params = await props.params
  const [{data: page}] = await Promise.all([
    sanityFetch({query: getPageQuery, params: {slug: params.slug.join('/')}}),
  ])

  if (!page?._id) {
    // return (
    //   <div className="py-40">
    //     <PageOnboarding />
    //   </div>
    // )
    return notFound()
  }

  return (
    <div className="my-12 lg:my-24">
      <Head>
        <title>{page.title}</title>
      </Head>
      <PageBuilderPage page={page as GetPageQueryResult} />
    </div>
  )
}
