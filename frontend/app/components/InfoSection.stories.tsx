import type {Meta, StoryObj} from '@storybook/nextjs'

import InfoSection from './InfoSection'
import type {InfoSection as InfoSectionType} from '@/sanity.types'

const block: InfoSectionType = {
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
    },
  ],
}

const meta = {
  title: 'Components/InfoSection',
  component: InfoSection,
} satisfies Meta<typeof InfoSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    block,
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}
