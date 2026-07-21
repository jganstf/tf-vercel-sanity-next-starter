import Link from 'next/link'

import DateComponent from '@/app/components/Date'
import Avatar from '@/app/components/Avatar'
import {dataAttr} from '@/sanity/lib/utils'
import {ExtractPageBuilderType} from '@/sanity/lib/types'

type ArchiveBlock = ExtractPageBuilderType<'archive'>
type ArchiveItem = NonNullable<ArchiveBlock['items']>[number]

const documentHref = (documentType: string, slug: string) =>
  documentType === 'post' ? `/posts/${slug}` : `/${slug}`

const ArchiveItemCard = ({item, documentType}: {item: ArchiveItem; documentType: string}) => {
  const {_id, title, slug, excerpt, date, author} = item

  return (
    <article
      data-sanity={dataAttr({id: _id, type: documentType, path: 'title'}).toString()}
      key={_id}
      className="border border-gray-200 rounded-sm p-6 bg-gray-50 flex flex-col justify-between transition-colors hover:bg-white relative"
    >
      {slug && (
        <Link
          className="hover:text-brand underline transition-colors"
          href={documentHref(documentType, slug)}
        >
          <span className="absolute inset-0 z-10" />
        </Link>
      )}
      <div>
        <h3 className="text-2xl mb-4">{title}</h3>
        {excerpt && (
          <p className="line-clamp-3 text-sm leading-6 text-gray-600 max-w-[70ch]">{excerpt}</p>
        )}
      </div>
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        {author && author.firstName && author.lastName && (
          <div className="flex items-center">
            <Avatar person={author} small={true} />
          </div>
        )}
        {date && (
          <time className="text-gray-500 text-xs font-mono" dateTime={date}>
            <DateComponent dateString={date} />
          </time>
        )}
      </div>
    </article>
  )
}

type ArchiveProps = {
  block: ArchiveBlock
  index: number
  // Needed if you want to createDataAttributes to do non-text overlays in Presentation (Visual Editing)
  pageId: string
  pageType: string
}

export default function Archive({block}: ArchiveProps) {
  const {heading, subheading, documentType, limit} = block
  const items = limit ? block.items?.slice(0, limit) : block.items

  if (!items || items.length === 0) {
    return (
      <div className="container my-12 prose">
        <h2>{heading || 'Archive'}</h2>
        <p>No content of this type has been published yet.</p>
      </div>
    )
  }

  return (
    <div className="container my-12">
      {heading && <h2 className="text-3xl text-gray-900 sm:text-4xl lg:text-5xl">{heading}</h2>}
      {subheading && <p className="mt-2 text-lg leading-8 text-gray-600">{subheading}</p>}
      <div className="pt-6 space-y-6">
        {items.map((item) => (
          <ArchiveItemCard key={item._id} item={item} documentType={documentType} />
        ))}
      </div>
    </div>
  )
}
