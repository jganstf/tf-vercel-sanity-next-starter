import type {Meta, StoryObj} from '@storybook/nextjs'
import FieldRenderer from './FieldRenderer'
import type {FormFieldDef} from '@/sanity/forms/types'

const meta = {title: 'Forms/FieldRenderer', component: FieldRenderer} satisfies Meta<typeof FieldRenderer>
export default meta
type Story = StoryObj<typeof meta>

const base = (over: Partial<FormFieldDef>): FormFieldDef => ({
  _key: 'k',
  label: 'Field',
  name: 'field',
  fieldType: 'text',
  ...over,
})

export const Text: Story = {args: {field: base({label: 'Full name', required: true})}}
export const Email: Story = {args: {field: base({label: 'Email', name: 'email', fieldType: 'email', required: true})}}
export const Textarea: Story = {args: {field: base({label: 'Message', name: 'message', fieldType: 'textarea'})}}
export const Select: Story = {
  args: {field: base({label: 'Topic', name: 'topic', fieldType: 'select', options: [{label: 'Sales', value: 'sales'}, {label: 'Support', value: 'support'}]})},
}
export const Consent: Story = {
  args: {field: base({label: 'Consent', name: 'consent', fieldType: 'consent', required: true, consentLabel: 'I agree to the terms.'})},
}
export const WithError: Story = {args: {field: base({label: 'Email', name: 'email', fieldType: 'email'}), error: 'Please enter a valid email address.'}}
