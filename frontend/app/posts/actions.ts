'use server'

import {sanityFetch} from '@/sanity/lib/live'
import {archivePostsCountQuery, archivePostsQuery} from '@/sanity/lib/queries'
import type {ArchivePostsQueryResult} from '@/sanity.types'

export async function fetchArchivePosts({
  search,
  category,
  offset,
  limit,
}: {
  search: string
  category: string
  offset: number
  limit: number
}): Promise<{posts: ArchivePostsQueryResult; hasMore: boolean}> {
  const [{data: posts}, {data: total}] = await Promise.all([
    sanityFetch({
      query: archivePostsQuery,
      // archivePostsQuery's GROQ slice takes two independent numeric params ($offset, $end)
      // rather than an in-query arithmetic expression, because groq-js typegen cannot
      // statically evaluate a slice bound like `$offset + $limit` (see Task 5 notes).
      params: {search, category, offset, end: offset + limit},
    }),
    sanityFetch({
      query: archivePostsCountQuery,
      params: {search, category},
    }),
  ])

  return {
    posts: posts ?? [],
    hasMore: offset + (posts?.length ?? 0) < (total ?? 0),
  }
}
