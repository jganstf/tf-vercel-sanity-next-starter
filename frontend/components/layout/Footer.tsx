import ResolvedLink from '@/components/ResolvedLink'
import { DereferencedLegalMenuItem } from '@/sanity/lib/types'

type FooterProps = {
  legalMenu?: DereferencedLegalMenuItem[]
}

const FooterMain = () => {
  return (
    <div className="footerMain bg-gray-100">
      <div className="px-global-margin py-10">
        <div className="tf-max-w">
          <p>Main content</p>
        </div>
      </div>
    </div>
  )
}

const FooterBottom = ({ legalMenu = [] }: FooterProps) => {
  return (
    <div className="footerBottom colorway--dark">
      <div className="px-global-margin py-4">
        <div className="tf-max-w">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
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
        </div>
      </div>
    </div>
  )
}

export default function Footer({ legalMenu }: FooterProps) {
  return (
    <footer className="relative">
      <FooterMain />
      <FooterBottom legalMenu={legalMenu} />
    </footer>
  )
}
