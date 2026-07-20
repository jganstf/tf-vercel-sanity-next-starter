import type {Meta, StoryObj} from '@storybook/nextjs'

import ResolvedLink from './ResolvedLink'

const meta = {
  title: 'Components/ResolvedLink',
  component: ResolvedLink,
} satisfies Meta<typeof ResolvedLink>

export default meta
type Story = StoryObj<typeof meta>

export const ExternalHref: Story = {
  args: {
    link: {
      _type: 'link',
      linkType: 'href',
      href: 'https://www.sanity.io',
      openInNewTab: true,
    },
    children: 'Visit Sanity',
  },
}

export const InternalPage: Story = {
  args: {
    link: {
      _type: 'link',
      linkType: 'page',
      page: 'about',
    },
    children: 'About page',
  },
}

export const NoLink: Story = {
  args: {
    link: undefined as never,
    children: 'Plain text, no anchor',
  },
}
