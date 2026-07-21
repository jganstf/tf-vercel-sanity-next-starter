import type {Meta, StoryObj} from '@storybook/nextjs'

import HeroSecondary from './HeroSecondary'
import type {HeroSecondary as HeroSecondaryType} from '@/sanity.types'

type HeroSecondaryStoryArgs = {
  heading?: string
  description?: string
  index?: number
  pageId?: string
  pageType?: string
  pageTitle?: string | null
}

const meta = {
  title: 'Sections/HeroSecondary',
  component: HeroSecondary,
  argTypes: {
    heading: {control: 'text'},
    description: {control: 'text'},
  },
  render: ({heading, description, ...args}) => {
    const block: HeroSecondaryType = {
      _type: 'heroSecondary',
      heading,
      description,
    }
    return <HeroSecondary block={block} {...args} />
  },
} satisfies Meta<HeroSecondaryStoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    heading: 'Building for what comes next',
    description: 'A closer look at how we approach structured content and design systems.',
    index: 0,
    pageId: 'page-1',
    pageType: 'page',
  },
}

export const FallsBackToPageTitle: Story = {
  args: {
    heading: undefined,
    description: 'A closer look at how we approach structured content and design systems.',
    pageTitle: 'About Temper & Forge',
  },
}

export const NoHeadingOrTitle: Story = {
  args: {
    heading: undefined,
    description: undefined,
    pageTitle: undefined,
  },
}
