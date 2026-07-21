import type {PortableTextBlock} from 'next-sanity'
import PortableText from '@/components/PortableText'
import type {FieldProps} from '@/sanity/forms/types'

export default function HtmlField({field}: FieldProps) {
  if (!field.content) return null
  return <PortableText value={field.content as PortableTextBlock[]} />
}
