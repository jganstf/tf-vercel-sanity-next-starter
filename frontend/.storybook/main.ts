import type {StorybookConfig} from '@storybook/nextjs'

const config: StorybookConfig = {
  stories: ['../app/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  env: (config) => ({
    ...config,
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'storybook',
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET || 'storybook',
  }),
  webpackFinal: (config) => {
    if (config.ignoreWarnings) {
      config.ignoreWarnings.push(/Critical dependency/)
    } else {
      config.ignoreWarnings = [/Critical dependency/]
    }
    return config
  },
}

export default config
