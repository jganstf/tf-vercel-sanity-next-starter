import {footerQuery} from '@/sanity/lib/queries'
import {sanityFetch} from '@/sanity/lib/live'
import ResolvedLink from '@/components/ResolvedLink'
import {DereferencedLegalMenuItem} from '@/sanity/lib/types'

const FooterMain = () => {
  return (
    <div className="footerMain">
      <p className="text-center text-sm text-gray-500">
        This is the main footer content.
      </p>
    </div>
  )
}

const FooterBottom = async () => {
  const {data: footer} = await sanityFetch({query: footerQuery})
  const legalMenu = (footer?.legalMenu ?? []) as DereferencedLegalMenuItem[]

  return (
    <div className="footerBottom flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
      <p className="text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} TF. All rights reserved.
      </p>
      {legalMenu.length > 0 && (
        <ul role="list" className="flex items-center gap-4">
          {legalMenu.map((item, index) => (
            <li key={index}>
              <ResolvedLink link={item.link} className="text-sm text-gray-500 hover:underline">
                {item.label}
              </ResolvedLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="bg-gray-50 relative py-4">
      <FooterMain />
      <FooterBottom />
      <div className="absolute inset-0 bg-[url(/images/tile-grid-black.png)] bg-size-[17px] opacity-20 bg-position-[0_1]" />
    </footer>
  )
}
