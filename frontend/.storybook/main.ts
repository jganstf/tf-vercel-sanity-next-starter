import path from 'node:path'
import {fileURLToPath} from 'node:url'

import type {StorybookConfig} from '@storybook/nextjs'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const config: StorybookConfig = {
  stories: ['../app/**/*.stories.@(ts|tsx)', '../components/**/*.stories.@(ts|tsx)'],
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
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...config.resolve.alias,
      'server-only': path.join(dirname, 'server-only-mock.js'),
    }
    return config
  },
}

export default config
