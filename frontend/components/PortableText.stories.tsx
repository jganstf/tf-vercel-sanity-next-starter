import type {Meta, StoryObj} from '@storybook/nextjs'
import type {PortableTextBlock} from 'next-sanity'

import PortableText from './PortableText'

const sampleValue: PortableTextBlock[] = [
  {
    _type: 'block',
    _key: 'b1',
    style: 'h2',
    children: [{_type: 'span', _key: 's1', text: 'A heading with an anchor link'}],
  },
  {
    _type: 'block',
    _key: 'b2',
    style: 'normal',
    children: [
      {_type: 'span', _key: 's2', text: 'Some body copy with a '},
      {_type: 'span', _key: 's3', text: 'linked phrase', marks: ['link1']},
      {_type: 'span', _key: 's4', text: ' inside it.'},
    ],
    markDefs: [{_type: 'link', _key: 'link1', linkType: 'href', href: 'https://www.sanity.io'}],
  },
]

const meta = {
  title: 'Components/PortableText',
  component: PortableText,
} satisfies Meta<typeof PortableText>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    value: sampleValue,
  },
}
