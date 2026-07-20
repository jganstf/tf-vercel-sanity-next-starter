import type {Meta, StoryObj} from '@storybook/nextjs'

import HeroSecondary from './HeroSecondary'
import type {HeroSecondary as HeroSecondaryType} from '@/sanity.types'

const block: HeroSecondaryType = {
  _type: 'heroSecondary',
  heading: 'Building for what comes next',
  description: 'A closer look at how we approach structured content and design systems.',
}

const meta = {
  title: 'Sections/HeroSecondary',
  component: HeroSecondary,
} satisfies Meta<typeof HeroSecondary>

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

export const FallsBackToPageTitle: Story = {
  args: {
    block: {_type: 'heroSecondary', description: block.description},
    pageTitle: 'About Temper & Forge',
  },
}

export const NoHeadingOrTitle: Story = {
  args: {
    block: undefined,
    pageTitle: undefined,
  },
}
