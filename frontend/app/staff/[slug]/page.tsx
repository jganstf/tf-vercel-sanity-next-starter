import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'

import Image from '@/app/components/SanityImage'
import {sanityFetch} from '@/sanity/lib/live'
import {staffQuery, staffSlugs} from '@/sanity/lib/queries'
import {resolveOpenGraphImage} from '@/sanity/lib/utils'

export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: staffSlugs,
    perspective: 'published',
    stega: false,
  })
  return data
}

export async function generateMetadata(props: PageProps<'/staff/[slug]'>): Promise<Metadata> {
  const params = await props.params
  const {data: member} = await sanityFetch({query: staffQuery, params, stega: false})
  const ogImage = resolveOpenGraphImage(member?.picture)

  return {
    title: member ? `${member.firstName} ${member.lastName}` : undefined,
    description: member?.jobTitle || undefined,
    openGraph: {
      images: ogImage ? [ogImage] : [],
    },
  } satisfies Metadata
}

export default async function StaffMemberPage(props: PageProps<'/staff/[slug]'>) {
  const params = await props.params
  const {data: member} = await sanityFetch({query: staffQuery, params})

  if (!member?._id) {
    return notFound()
  }

  return (
    <div className="container my-12 lg:my-24 grid gap-8 max-w-3xl">
      <div className="flex items-center gap-6">
        {member.picture?.asset?._ref && (
          <div className="h-24 w-24 shrink-0">
            <Image
              id={member.picture.asset._ref}
              alt={member.picture.alt || ''}
              className="h-full w-full rounded-full"
              width={96}
              height={96}
              hotspot={member.picture.hotspot}
              crop={member.picture.crop}
              mode="cover"
            />
          </div>
        )}
        <div>
          <h1 className="text-4xl text-gray-900 sm:text-5xl">
            {member.firstName} {member.lastName}
          </h1>
          {member.jobTitle && <p className="text-lg text-gray-600 mt-1">{member.jobTitle}</p>}
          {member.department?.title && (
            <Link
              href={`/staff?department=${member.department.slug}`}
              className="text-sm text-brand underline underline-offset-4 mt-1 inline-block"
            >
              {member.department.title}
            </Link>
          )}
        </div>
      </div>
      {member.bio && <p className="text-gray-700 leading-7 whitespace-pre-line">{member.bio}</p>}
    </div>
  )
}
