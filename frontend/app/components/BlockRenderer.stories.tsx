import type {Meta, StoryObj} from '@storybook/nextjs'

import BlockRenderer from './BlockRenderer'
import type {PageBuilderSection} from '@/sanity/lib/types'

const callToActionBlock: PageBuilderSection = {
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

const infoSectionBlock: PageBuilderSection = {
  _key: 'info-1',
  _type: 'infoSection',
  heading: 'Why structured content matters',
  subheading: 'Content that works everywhere',
  content: [
    {
      _type: 'block',
      _key: 'b1',
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: 's1',
          text: 'Structured content lets you reuse the same data across web, mobile, and beyond.',
        },
      ],
      markDefs: [],
    },
  ],
}

const unknownBlock = {_key: 'unknown-1', _type: 'somethingNotBuiltYet'} as unknown as PageBuilderSection

const meta = {
  title: 'Components/BlockRenderer',
  component: BlockRenderer,
} satisfies Meta<typeof BlockRenderer>

export default meta
type Story = StoryObj<typeof meta>

export const CallToAction: Story = {
  args: {
    block: callToActionBlock,
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}

export const InfoSectionBlock: Story = {
  args: {
    block: infoSectionBlock,
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}

export const UnknownBlockType: Story = {
  args: {
    block: unknownBlock,
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}
