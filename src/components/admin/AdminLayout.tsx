import { useEffect, useState } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  Users,
  Image,
  LogOut,
  Megaphone,
  MessageSquare,
  Truck,
  Store,
  BarChart3,
  Headphones,
  Percent,
  ExternalLink,
  LifeBuoy,
  Settings,
  FileCode,
  Menu,
  X
} from 'lucide-react'

export default function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/giris')
    }
  }, [user, isAdmin, loading])

  // Sayfa değiştiğinde sidebar'ı kapat (mobilde)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) return null

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/urunler', icon: Package, label: 'Ürünler' },
    { path: '/admin/kategoriler', icon: FolderTree, label: 'Kategoriler' },
    { path: '/admin/markalar', icon: Tag, label: 'Markalar' },
    { path: '/admin/siparisler', icon: ShoppingCart, label: 'Siparişler' },
    { path: '/admin/kargo', icon: Truck, label: 'Kargo' },
    { path: '/admin/bayiler', icon: Store, label: 'Bayiler' },
    { path: '/admin/bayi-satislari', icon: BarChart3, label: 'Bayi Satışları' },
    { path: '/admin/musteriler', icon: Users, label: 'Müşteriler' },
    { path: '/admin/iskonto', icon: Percent, label: 'İskonto Grupları' },
    { path: '/admin/xml-yonetim', icon: FileCode, label: 'XML Yönetimi' },
    { path: '/admin/ayarlar', icon: Settings, label: 'Ayarlar' },
    { path: '/admin/kampanyalar', icon: Megaphone, label: 'Kampanya & Banner' },
    { path: '/admin/sorular', icon: MessageSquare, label: 'Sorular' },
    { path: '/admin/canli-destek', icon: Headphones, label: 'Canlı Destek' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gray-900 flex items-center justify-between px-4 z-40">
        <h1 className="text-lg font-bold text-white">Admin Panel</h1>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-gray-900 text-white flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}>
        <div className="p-6 flex-shrink-0 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-6 py-3 transition-colors ${isActive
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}

          {/* Ana Sayfa - Yeni sekmede açılır */}
          <div className="border-t border-gray-800 mt-2 pt-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-6 py-3 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <ExternalLink className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Ana Sayfa</span>
            </a>
          </div>
        </nav>

        <div className="flex-shrink-0 border-t border-gray-800">
          <button
            onClick={() => {
              signOut()
              navigate('/')
            }}
            className="flex items-center gap-3 px-6 py-4 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8 min-h-screen">
        <Outlet />
      </div>
    </div>
  )
}

