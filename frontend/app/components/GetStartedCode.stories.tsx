import type {Meta, StoryObj} from '@storybook/nextjs'

import GetStartedCode from './GetStartedCode'

const meta = {
  title: 'Components/GetStartedCode',
  component: GetStartedCode,
} satisfies Meta<typeof GetStartedCode>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
