import 'server-only'
import {createClient, type SanityClient} from 'next-sanity'
import {apiVersion, dataset, projectId} from '@/sanity/lib/api'

let cached: SanityClient | null = null

/**
 * Server-only Sanity client with write access, used by the form submission
 * Server Action to create `formSubmission` documents and upload file assets.
 * Lazily created so a missing token only fails at submit time, not at build.
 */
export function getWriteClient(): SanityClient {
  if (cached) return cached
  const token = process.env.SANITY_API_WRITE_TOKEN
  if (!token) {
    throw new Error('Missing SANITY_API_WRITE_TOKEN')
  }
  cached = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
    token,
  })
  return cached
}
