import type {Meta, StoryObj} from '@storybook/nextjs'

import Avatar from './Avatar'

const meta = {
  title: 'Components/Avatar',
  component: Avatar,
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    person: {firstName: 'Ada', lastName: 'Lovelace'},
    date: '2026-03-14T00:00:00.000Z',
  },
}

export const Small: Story = {
  args: {
    person: {firstName: 'Ada', lastName: 'Lovelace'},
    date: '2026-03-14T00:00:00.000Z',
    small: true,
  },
}

export const NoPerson: Story = {
  args: {
    person: {firstName: null, lastName: null},
  },
}
