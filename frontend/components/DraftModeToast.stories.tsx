import type {Meta, StoryObj} from '@storybook/nextjs'
import {Toaster} from 'sonner'

import DraftModeToast from './DraftModeToast'

const meta = {
  title: 'Components/DraftModeToast',
  component: DraftModeToast,
  decorators: [
    (Story) => (
      <>
        <Toaster />
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof DraftModeToast>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
