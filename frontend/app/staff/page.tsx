import type {Metadata} from 'next'
import Link from 'next/link'
import {PortableText} from '@portabletext/react'

import {StaffGrid} from '@/app/components/Staff'
import {sanityFetch} from '@/sanity/lib/live'
import {allDepartmentsQuery, allStaffQuery, staffSettingsQuery} from '@/sanity/lib/queries'

export async function generateMetadata(): Promise<Metadata> {
  const {data: staffSettings} = await sanityFetch({query: staffSettingsQuery, stega: false})
  return {
    title: staffSettings?.title || 'Our Staff',
  } satisfies Metadata
}

export default async function StaffArchivePage(props: PageProps<'/staff'>) {
  const searchParams = await props.searchParams
  const department =
    typeof searchParams.department === 'string' ? searchParams.department : null

  const [{data: staffSettings}, {data: departments}, {data: staff}] = await Promise.all([
    sanityFetch({query: staffSettingsQuery}),
    sanityFetch({query: allDepartmentsQuery}),
    sanityFetch({query: allStaffQuery, params: {department}}),
  ])

  return (
    <div className="container my-12 lg:my-24 grid gap-12">
      <div className="max-w-3xl flex flex-col gap-6">
        <h1 className="text-4xl text-gray-900 sm:text-5xl lg:text-7xl">
          {staffSettings?.title || 'Our Staff'}
        </h1>
        {staffSettings?.intro && (
          <div className="prose">
            <PortableText value={staffSettings.intro} />
          </div>
        )}
      </div>

      {departments && departments.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          <Link
            href="/staff"
            className={`text-sm underline-offset-4 ${!department ? 'font-bold underline' : 'text-gray-600 hover:underline'}`}
          >
            All
          </Link>
          {departments.map((dept) => (
            <Link
              key={dept.slug}
              href={`/staff?department=${dept.slug}`}
              className={`text-sm underline-offset-4 ${department === dept.slug ? 'font-bold underline' : 'text-gray-600 hover:underline'}`}
            >
              {dept.title}
            </Link>
          ))}
        </div>
      )}

      {staff && staff.length > 0 ? (
        <StaffGrid staff={staff} />
      ) : (
        <p className="text-gray-600">No staff members found.</p>
      )}
    </div>
  )
}
