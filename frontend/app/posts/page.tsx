import type {Metadata} from 'next'

import PostArchive from '@/app/components/PostArchive'
import {sanityFetch} from '@/sanity/lib/live'
import {
  archivePostsCountQuery,
  archivePostsQuery,
  postCategoriesQuery,
  postSettingsQuery,
} from '@/sanity/lib/queries'

export const metadata: Metadata = {
  title: 'Blog Archive',
  description: 'Search and browse all blog posts by category.',
}

const DEFAULT_POSTS_PER_PAGE = 6
const DEFAULT_LOAD_MORE_MODE = 'button' as const

export default async function PostsArchivePage(props: PageProps<'/posts'>) {
  const resolvedSearchParams = await props.searchParams
  const search =
    typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : ''
  const category =
    typeof resolvedSearchParams.category === 'string' ? resolvedSearchParams.category : ''

  const {data: settings} = await sanityFetch({query: postSettingsQuery})
  const postsPerPage = settings?.postsPerPage ?? DEFAULT_POSTS_PER_PAGE
  const loadMoreMode =
    settings?.loadMoreMode === 'infiniteScroll' ? 'infiniteScroll' : DEFAULT_LOAD_MORE_MODE

  const [{data: categories}, {data: posts}, {data: total}] = await Promise.all([
    sanityFetch({query: postCategoriesQuery}),
    sanityFetch({
      query: archivePostsQuery,
      // See Task 5/7 notes: archivePostsQuery's slice takes independent $offset/$end params.
      params: {search, category, offset: 0, end: postsPerPage},
    }),
    sanityFetch({query: archivePostsCountQuery, params: {search, category}}),
  ])

  return (
    <div className="container my-12 lg:my-24">
      <h1 className="text-4xl text-gray-900 sm:text-5xl mb-8">Blog Archive</h1>
      <PostArchive
        initialPosts={posts ?? []}
        initialHasMore={(posts?.length ?? 0) < (total ?? 0)}
        categories={categories ?? []}
        postsPerPage={postsPerPage}
        loadMoreMode={loadMoreMode}
        initialSearch={search}
        initialCategory={category}
      />
    </div>
  )
}
