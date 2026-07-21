import type {NextConfig} from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL('https://cdn.sanity.io/**')],
  },
  experimental: {
    serverActions: {
      // Must cover the largest form file field (schema default is 10 MB) plus overhead.
      bodySizeLimit: '12mb',
    },
  },
}

export default nextConfig
