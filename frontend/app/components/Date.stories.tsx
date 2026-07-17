import type {Meta, StoryObj} from '@storybook/nextjs'

import DateComponent from './Date'

const meta = {
  title: 'Components/Date',
  component: DateComponent,
} satisfies Meta<typeof DateComponent>

export default meta
type Story = StoryObj<typeof meta>

export const WithDate: Story = {
  args: {
    dateString: '2026-03-14T00:00:00.000Z',
  },
}

export const Undefined: Story = {
  args: {
    dateString: undefined,
  },
}
