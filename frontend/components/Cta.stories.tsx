import type {Meta, StoryObj} from '@storybook/nextjs'

import Cta from './Cta'
import type {ExtractPageBuilderType} from '@/sanity/lib/types'

const block: ExtractPageBuilderType<'callToAction'> = {
  _key: 'cta-1',
  _type: 'callToAction',
  eyebrow: 'Get started',
  heading: 'Build your next site with Sanity + Next.js',
  body: [
    {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      children: [{_type: 'span', _key: 's1', text: 'Structured content, real-time editing.'}],
    },
  ],
  button: {
    _type: 'button',
    buttonText: 'Get started',
    link: {
      _type: 'link',
      linkType: 'href',
      href: 'https://www.sanity.io',
      page: null,
      post: null,
    },
  },
  theme: 'light',
  contentAlignment: 'textFirst',
}

const meta = {
  title: 'Components/Cta',
  component: Cta,
} satisfies Meta<typeof Cta>

export default meta
type Story = StoryObj<typeof meta>

export const Light: Story = {
  args: {
    block,
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}

export const Dark: Story = {
  args: {
    block: {...block, theme: 'dark'},
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}
