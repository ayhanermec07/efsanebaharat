import { useEffect } from 'react'
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
  BarChart3
} from 'lucide-react'

export default function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/giris')
    }
  }, [user, isAdmin, loading])

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
    { path: '/admin/bannerlar', icon: Image, label: 'Banner' },
    { path: '/admin/kampanyalar', icon: Megaphone, label: 'Kampanyalar' },
    { path: '/admin/sorular', icon: MessageSquare, label: 'Sorular' },
    { path: '/admin/canli-destek', icon: MessageSquare, label: 'Canlı Destek' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900 text-white">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-6 py-3 transition ${
                  isActive
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-6">
          <button
            onClick={() => {
              signOut()
              navigate('/')
            }}
            className="flex items-center space-x-3 text-gray-300 hover:text-white transition w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <Outlet />
      </div>
    </div>
  )
}
