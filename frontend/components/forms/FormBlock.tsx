import {mapFormDef} from '@/sanity/forms/mapFormDef'
import {PageBuilderSection} from '@/sanity/lib/types'
import FormRenderer from './FormRenderer'

// The page GROQ query dereferences `form->{...}`, so the resolved form arrives on the block.
type FormBlockProps = {
  block: PageBuilderSection
}

export default function FormBlock({block}: FormBlockProps) {
  const formBlock = block as {form?: unknown}
  const form = mapFormDef(formBlock.form)
  // CMS-backed: render nothing when the block has no form yet.
  if (!form || form.fields.length === 0) return null
  return <FormRenderer form={form} />
}
