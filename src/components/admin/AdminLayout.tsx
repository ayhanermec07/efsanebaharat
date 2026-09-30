import { useEffect, useState } from 'react'
import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
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
  Boxes,
  AlertTriangle,
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
      navigate('/giris', { replace: true })
    }
  }, [user, isAdmin, loading, navigate])

  // Sayfa değiştiğinde sidebar'ı kapat (mobilde)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/giris" replace />
  }

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
    { path: '/admin/asorti-stok', icon: Boxes, label: 'Asorti Stok' },
    { path: '/admin/ayarlar', icon: Settings, label: 'Ayarlar' },
    { path: '/admin/kampanyalar', icon: Megaphone, label: 'Kampanyalar' },
    { path: '/admin/sorular', icon: MessageSquare, label: 'Sorular' },
    { path: '/admin/canli-destek', icon: Headphones, label: 'Canlı Destek' }
  ]

  return (
    <div className="anadolu-ui anadolu-admin min-h-screen min-w-0 bg-brand-cream">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-brand-line bg-brand-paper flex items-center justify-between gap-3 px-4 z-40">
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-brand-ink">Efsane Baharat</p><p className="text-xs text-brand-muted">Yönetim paneli</p></div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="shop-icon-button"
          aria-label="Yönetim menüsünü aç"
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
      <div className={`fixed inset-y-0 left-0 w-64 border-r border-brand-line bg-brand-paper text-brand-ink flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}>
        <div className="border-b border-brand-line p-5 flex-shrink-0 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Yönetim paneli</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="shop-icon-button lg:hidden"
            aria-label="Yönetim menüsünü kapat"
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
                className={`mx-2 flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 transition-colors ${isActive
                  ? 'bg-brand text-white'
                  : 'text-brand-muted hover:bg-brand-soft hover:text-brand-ink'
                  }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}

          {/* Ana Sayfa - Yeni sekmede açılır */}
          <div className="border-t border-brand-line mt-2 pt-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-2 flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-brand-muted hover:bg-brand-soft hover:text-brand-ink transition-colors"
            >
              <ExternalLink className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Ana Sayfa</span>
            </a>
          </div>
        </nav>

        <div className="flex-shrink-0 border-t border-brand-line">
          <button
            onClick={() => {
              signOut()
              navigate('/')
            }}
            className="flex min-h-11 items-center gap-3 px-5 py-4 text-brand-muted hover:bg-brand-soft hover:text-brand-ink transition-colors w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-w-0 lg:ml-64 p-4 sm:p-6 lg:p-8 pt-20 sm:pt-20 lg:pt-8 min-h-screen">
        <Outlet />
      </div>
    </div>
  )
}
