import {HeroSecondary as HeroSecondaryBlock} from '@/sanity.types'

type HeroSecondaryProps = {
  block?: HeroSecondaryBlock
  index?: number
  pageId?: string
  pageType?: string
}

export default function HeroSecondary({block}: HeroSecondaryProps) {
  return (
    <section className="px-global-margin py-md overflow-hidden">
      <div className="tf-max-w">
        {block?.heading && <h2 className="text-h1">{block.heading}</h2>}
        {block?.description && <p>{block.description}</p>}
      </div>
    </section>
  )
}
