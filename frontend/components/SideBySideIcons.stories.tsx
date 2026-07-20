import type {Meta, StoryObj} from '@storybook/nextjs'

import SideBySideIcons from './SideBySideIcons'

const meta = {
  title: 'Components/SideBySideIcons',
  component: SideBySideIcons,
} satisfies Meta<typeof SideBySideIcons>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
