'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {usePathname, useRouter, useSearchParams} from 'next/navigation'

import PostCard from '@/app/components/PostCard'
import {fetchArchivePosts} from '@/app/posts/actions'
import type {AllPostsQueryResult, PostCategoriesQueryResult} from '@/sanity.types'

export type PostArchiveProps = {
  initialPosts: AllPostsQueryResult
  initialHasMore: boolean
  categories: PostCategoriesQueryResult
  postsPerPage: number
  loadMoreMode: 'button' | 'infiniteScroll'
  initialSearch: string
  initialCategory: string
}

export default function PostArchive({
  initialPosts,
  initialHasMore,
  categories,
  postsPerPage,
  loadMoreMode,
  initialSearch,
  initialCategory,
}: PostArchiveProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const search = searchParams.get('q') ?? initialSearch
  const category = searchParams.get('category') ?? initialCategory

  const [searchInput, setSearchInput] = useState(search)
  const [posts, setPosts] = useState<AllPostsQueryResult>(initialPosts)
  const [offset, setOffset] = useState(initialPosts.length)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isLoading, setIsLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  const updateQuery = useCallback(
    (next: {q?: string; category?: string}) => {
      const params = new URLSearchParams(searchParams.toString())
      if (next.q !== undefined) {
        if (next.q) params.set('q', next.q)
        else params.delete('q')
      }
      if (next.category !== undefined) {
        if (next.category) params.set('category', next.category)
        else params.delete('category')
      }
      router.replace(`${pathname}?${params.toString()}`)
    },
    [pathname, router, searchParams],
  )

  // Debounce free-text search input into a URL update.
  useEffect(() => {
    const handle = setTimeout(() => {
      const trimmed = searchInput.trim()
      if (trimmed !== search) {
        updateQuery({q: trimmed})
      }
    }, 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  // Re-fetch page 1 whenever the URL's search/category change (skip on first render, it's already server-rendered).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    let cancelled = false
    setIsLoading(true)
    fetchArchivePosts({search, category, offset: 0, limit: postsPerPage}).then((result) => {
      if (cancelled) return
      setPosts(result.posts)
      setOffset(result.posts.length)
      setHasMore(result.hasMore)
      setIsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [search, category, postsPerPage])

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return
    setIsLoading(true)
    fetchArchivePosts({search, category, offset, limit: postsPerPage}).then((result) => {
      setPosts((prev) => [...prev, ...result.posts])
      setOffset((prev) => prev + result.posts.length)
      setHasMore(result.hasMore)
      setIsLoading(false)
    })
  }, [search, category, offset, postsPerPage, isLoading, hasMore])

  useEffect(() => {
    if (loadMoreMode !== 'infiniteScroll') return
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      {rootMargin: '200px'},
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [loadMoreMode, loadMore])

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search posts..."
          aria-label="Search posts"
          className="border border-gray-200 rounded-sm px-4 py-2 flex-1"
        />
        <select
          value={category}
          onChange={(e) => updateQuery({category: e.target.value})}
          aria-label="Filter by category"
          className="border border-gray-200 rounded-sm px-4 py-2"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c.slug ?? ''}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {posts.length === 0 && !isLoading ? (
        <p className="text-gray-600">No posts found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      )}

      {loadMoreMode === 'button' && hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoading}
            className="border border-gray-200 rounded-sm px-6 py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {loadMoreMode === 'infiniteScroll' && <div ref={sentinelRef} className="h-1" aria-hidden />}
    </div>
  )
}
