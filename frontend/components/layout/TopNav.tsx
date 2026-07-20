export default function TopNav() {
  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <div className="text-xl font-bold">My App</div>
          <div>
            <a href="#" className="hover:text-gray-300">Home</a>
            <a href="#" className="hover:text-gray-300 ml-4">About</a>
            <a href="#" className="hover:text-gray-300 ml-4">Contact</a>
          </div>
        </div>
      </div>
    </nav>
  )
}