import {HeroSecondary as HeroSecondaryBlock} from '@/sanity.types'

type HeroSecondaryProps = {
  block?: HeroSecondaryBlock
  index?: number
  pageId?: string
  pageType?: string
  pageTitle?: string | null
}

export default function HeroSecondary({block, pageTitle}: HeroSecondaryProps) {
  const heading = block?.heading || pageTitle

  if (!heading) {
    return null
  }

  return (
    <section className="px-global-margin py-md overflow-hidden">
      <div className="tf-max-w">
        <h2 className="text-h1">{heading}</h2>
        {block?.description && <p>{block.description}</p>}
      </div>
    </section>
  )
}
