import type {Meta, StoryObj} from '@storybook/nextjs'

import Accordion from './Accordion'

const meta = {
  title: 'Components/Accordion',
  component: Accordion,
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

const items = [
  {
    id: 'shipping',
    title: 'What are your shipping options?',
    content: <p>We offer standard, express, and overnight shipping on all orders.</p>,
  },
  {
    id: 'returns',
    title: 'What is your return policy?',
    content: <p>Items can be returned within 30 days of delivery for a full refund.</p>,
  },
  {
    id: 'support',
    title: 'How do I contact support?',
    content: <p>Reach our team any time at support@example.com.</p>,
  },
]

export const SingleOpen: Story = {
  args: {
    items,
    type: 'single',
    defaultOpenId: 'shipping',
  },
}

export const MultipleOpen: Story = {
  args: {
    items,
    type: 'multiple',
    defaultOpenIds: ['shipping', 'returns'],
  },
}

export const AllClosed: Story = {
  args: {
    items,
  },
}
