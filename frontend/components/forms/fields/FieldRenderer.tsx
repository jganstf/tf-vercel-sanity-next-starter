import type {FieldProps} from '@/sanity/forms/types'
import TextInputField from './TextInputField'
import TextareaField from './TextareaField'
import SelectField from './SelectField'
import RadioField from './RadioField'
import MultiSelectField from './MultiSelectField'
import ConsentField from './ConsentField'
import FileField from './FileField'
import HtmlField from './HtmlField'

export default function FieldRenderer({field, error}: FieldProps) {
  switch (field.fieldType) {
    case 'textarea':
      return <TextareaField field={field} error={error} />
    case 'select':
      return <SelectField field={field} error={error} />
    case 'radio':
      return <RadioField field={field} error={error} />
    case 'multiSelect':
      return <MultiSelectField field={field} error={error} />
    case 'consent':
      return <ConsentField field={field} error={error} />
    case 'file':
      return <FileField field={field} error={error} />
    case 'html':
      return <HtmlField field={field} error={error} />
    case 'text':
    case 'email':
    case 'phone':
    case 'url':
    case 'time':
    default:
      return <TextInputField field={field} error={error} />
  }
}
