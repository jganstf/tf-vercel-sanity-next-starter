import type {Meta, StoryObj} from '@storybook/nextjs'

import Footer from './Footer'
import type {DereferencedLegalMenuItem} from '@/sanity/lib/types'

const legalMenu: DereferencedLegalMenuItem[] = [
  {label: 'Privacy Policy', link: {_type: 'link', linkType: 'href', href: '/privacy'}},
  {label: 'Terms of Service', link: {_type: 'link', linkType: 'href', href: '/terms'}},
]

const meta = {
  title: 'Components/Footer',
  component: Footer,
} satisfies Meta<typeof Footer>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {legalMenu},
}

export const NoLegalMenu: Story = {
  args: {legalMenu: []},
}
