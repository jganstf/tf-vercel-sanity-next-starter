import Link from 'next/link'

import Image from '@/app/components/SanityImage'
import {AllStaffQueryResult} from '@/sanity.types'
import {dataAttr} from '@/sanity/lib/utils'

const StaffCard = ({member}: {member: AllStaffQueryResult[number]}) => {
  const {_id, firstName, lastName, slug, picture, jobTitle, department} = member

  return (
    <Link
      href={`/staff/${slug}`}
      data-sanity={dataAttr({id: _id, type: 'staff', path: 'firstName'}).toString()}
      className="border border-gray-200 rounded-sm p-6 bg-gray-50 flex flex-col gap-4 transition-colors hover:bg-white"
    >
      {picture?.asset?._ref && (
        <div className="h-16 w-16">
          <Image
            id={picture.asset._ref}
            alt={picture.alt || ''}
            className="h-full w-full rounded-full"
            width={64}
            height={64}
            hotspot={picture.hotspot}
            crop={picture.crop}
            mode="cover"
          />
        </div>
      )}
      <div>
        <h3 className="text-xl">
          {firstName} {lastName}
        </h3>
        {jobTitle && <p className="text-sm text-gray-600">{jobTitle}</p>}
        {department?.title && <p className="text-xs text-gray-500 font-mono">{department.title}</p>}
      </div>
    </Link>
  )
}

export const StaffGrid = ({staff}: {staff: AllStaffQueryResult}) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {staff.map((member) => (
      <StaffCard key={member._id} member={member} />
    ))}
  </div>
)
