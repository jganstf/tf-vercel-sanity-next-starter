import type {Meta, StoryObj} from '@storybook/nextjs'

import Onboarding, {PageOnboarding} from './Onboarding'

const meta = {
  title: 'Components/Onboarding',
  component: Onboarding,
} satisfies Meta<typeof Onboarding>

export default meta
type Story = StoryObj<typeof meta>

export const NoPosts: Story = {}

export const NoAboutPage: Story = {
  render: () => <PageOnboarding />,
}
