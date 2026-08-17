import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

export default function Layout() {
  return (
    <div className="shop-shell flex min-h-screen min-w-0 flex-col overflow-x-clip">
      <Header />
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
