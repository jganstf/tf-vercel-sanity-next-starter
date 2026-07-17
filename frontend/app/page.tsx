// import {Suspense} from 'react'
// import Link from 'next/link'
// import {PortableText} from '@portabletext/react'

// import {AllPosts} from '@/components/Posts'
// import GetStartedCode from '@/components/GetStartedCode'
// import SideBySideIcons from '@/components/SideBySideIcons'
import {settingsQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'
// import {dataAttr} from '@/sanity/lib/utils'
import StarterIntro from '@/components/StarterIntro'
import StarterRecentPosts from '@/components/StarterRecentPosts'
import HeroSecondary from '@/components/sections/hero/HeroSecondary/HeroSecondary'

export default async function Page() {
  const {data: settings} = await sanityFetch({
    query: settingsQuery,
  })

  return (
    <>
      {/* <StarterIntro settings={settings}/> */}
      <HeroSecondary />
      <StarterRecentPosts settings={settings} />
    </>
  )
}
