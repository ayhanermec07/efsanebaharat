import { useEffect, useRef, useState } from 'react'
import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  ShoppingCart,
  Users,
  LogOut,
  Megaphone,
  MessageSquare,
  Truck,
  Store,
  BarChart3,
  Headphones,
  Percent,
  ExternalLink,
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
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/giris', { replace: true })
    }
  }, [user, isAdmin, loading, navigate])

  // Sayfa değiştiğinde sidebar'ı kapat (mobilde)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!sidebarOpen) return
    const menuButton = menuButtonRef.current
    closeButtonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const items = sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      if (!items?.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      menuButton?.focus()
    }
  }, [sidebarOpen])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/giris" replace />
  }

  const menuGroups = [
    { label: 'Genel', items: [
      { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' }
    ] },
    { label: 'Katalog', items: [
      { path: '/admin/urunler', icon: Package, label: 'Ürünler' },
      { path: '/admin/kategoriler', icon: FolderTree, label: 'Kategoriler' },
      { path: '/admin/markalar', icon: Tag, label: 'Markalar' },
      { path: '/admin/asorti-stok', icon: Boxes, label: 'Asorti Stok' },
      { path: '/admin/stok-azalan', icon: AlertTriangle, label: 'Azalan Stok' },
      { path: '/admin/kampanyalar', icon: Megaphone, label: 'Kampanyalar' }
    ] },
    { label: 'Sipariş', items: [
      { path: '/admin/siparisler', icon: ShoppingCart, label: 'Siparişler' },
      { path: '/admin/kargo', icon: Truck, label: 'Kargo' },
      { path: '/admin/bayi-satislari', icon: BarChart3, label: 'Bayi Satışları' }
    ] },
    { label: 'Müşteri', items: [
      { path: '/admin/musteriler', icon: Users, label: 'Müşteriler' },
      { path: '/admin/bayiler', icon: Store, label: 'Bayiler' },
      { path: '/admin/iskonto', icon: Percent, label: 'İskonto Grupları' },
      { path: '/admin/sorular', icon: MessageSquare, label: 'Sorular' },
      { path: '/admin/canli-destek', icon: Headphones, label: 'Canlı Destek' }
    ] },
    { label: 'Entegrasyon', items: [
      { path: '/admin/xml-yonetim', icon: FileCode, label: 'XML Yönetimi' }
    ] },
    { label: 'Ayarlar', items: [
      { path: '/admin/ayarlar', icon: Settings, label: 'Site Ayarları' }
    ] }
  ]

  return (
    <div className="anadolu-ui anadolu-admin min-h-screen min-w-0 bg-brand-cream">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-brand-line bg-brand-paper flex items-center justify-between gap-3 px-4 z-40">
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-brand-ink">Efsane Baharat</p><p className="text-xs text-brand-muted">Yönetim paneli</p></div>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="shop-icon-button"
          aria-label="Yönetim menüsünü aç"
          aria-controls="admin-sidebar"
          aria-expanded={sidebarOpen}
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
      <div ref={sidebarRef} id="admin-sidebar" role={sidebarOpen ? 'dialog' : undefined} aria-modal={sidebarOpen ? 'true' : undefined} aria-label={sidebarOpen ? 'Yönetim menüsü' : undefined} className={`fixed inset-y-0 left-0 w-64 border-r border-brand-line bg-brand-paper text-brand-ink flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
        } lg:visible lg:translate-x-0`}>
        <div className="border-b border-brand-line p-5 flex-shrink-0 flex items-center justify-between gap-3">
          <div><p className="font-display text-2xl font-medium">Efsane Baharat</p><p className="mt-1 text-xs text-brand-muted">Yönetim paneli</p></div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="shop-icon-button lg:hidden"
            aria-label="Yönetim menüsünü kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 space-y-1">
          {menuGroups.map(group => (
            <div key={group.label} className="border-t border-brand-line pt-3 first:border-0 first:pt-0">
              <p className="px-5 pb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-brand-muted">{group.label}</p>
              {group.items.map(item => {
                const Icon = item.icon
                const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(`${item.path}/`))
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`mx-2 flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 transition-colors ${isActive
                      ? 'site-primary-bg text-white'
                      : 'text-brand-muted hover:bg-brand-soft hover:text-brand-ink'
                      }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}

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
