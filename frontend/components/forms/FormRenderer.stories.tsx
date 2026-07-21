import type {Meta, StoryObj} from '@storybook/nextjs'
import FormRenderer from './FormRenderer'
import type {FormDef} from '@/sanity/forms/types'

const form: FormDef = {
  _id: 'form-1',
  title: 'Contact us',
  captchaEnabled: false,
  successBehavior: {type: 'message', message: 'Thanks!'},
  fields: [
    {_key: '1', label: 'Full name', name: 'name', fieldType: 'text', required: true},
    {_key: '2', label: 'Email', name: 'email', fieldType: 'email', required: true},
    {_key: '3', label: 'Message', name: 'message', fieldType: 'textarea', required: true},
    {_key: '4', label: 'Consent', name: 'consent', fieldType: 'consent', required: true, consentLabel: 'I agree to be contacted.'},
  ],
}

const meta = {title: 'Forms/FormRenderer', component: FormRenderer} satisfies Meta<typeof FormRenderer>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {args: {form}}
