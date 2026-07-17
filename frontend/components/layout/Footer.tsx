const FooterMain = () => {
  return (
    <div className="footerMain">
      <p className="text-center text-sm text-gray-500">
        This is the main footer content.
      </p>
    </div>
  )
}

const FooterBottom = () => {
  return (
    <div className="footerBottom">
      <p className="text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} TF. All rights reserved.
      </p>
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
