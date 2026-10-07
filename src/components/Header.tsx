import { SiteImage } from './SiteImage'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, LayoutDashboard, LogOut, Menu, Search, ShoppingBag, Sprout, User, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSepet } from '../contexts/SepetContext'
import { useTheme } from '../contexts/ThemeContext'
import { publicSupabase } from '../lib/supabase'
import { getImageUrl } from '../utils/imageUtils'
import { loadPublicCatalog, type CatalogCategory } from '../lib/catalog'
import { buildCategoryTree, loadCategories } from '../lib/category-hierarchy'
import CategoryNavigation from './CategoryNavigation'
import CategoryMegaMenu from './CategoryMegaMenu'
import { formatPrice } from '../lib/currency'
import AccessibleModal from './admin/AccessibleModal'

const navLinks = [
  { to: '/en-cok-satan', label: 'En Çok Satanlar' },
  { to: '/kampanyalar', label: 'Kampanyalar' },
]

export default function Header() {
  const { user, isAdmin, musteriData, signOut } = useAuth()
  const { logo, siteInfo, loading: themeLoading } = useTheme()
  const { sepetItems, toplamAdet } = useSepet()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [kategoriler, setKategoriler] = useState<CatalogCategory[]>([])
  const [categoryLoadError, setCategoryLoadError] = useState(false)
  const categoryTree = useMemo(() => buildCategoryTree(kategoriler), [kategoriler])
  const navigate = useNavigate()

  const headerRef = useRef<HTMLElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchToggleRef = useRef<HTMLButtonElement>(null)
  const categoryToggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const header = headerRef.current
    if (!header) return
    const measure = () => document.documentElement.style.setProperty('--store-header-height', `${header.getBoundingClientRect().height}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--store-header-height') }
  }, [])

  const searchContainerRef = useRef<HTMLDivElement>(null)
  const categoryMenuRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRequestRef = useRef(0)

  useEffect(() => {
    loadKategoriler()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node) && !searchToggleRef.current?.contains(e.target as Node)) {
        setSearchResults([])
        setSearchOpen(false)
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) setShowCategoryMenu(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (document.getElementById('header-category-tree')?.contains(document.activeElement)) categoryToggleRef.current?.focus()
        if (searchContainerRef.current?.contains(document.activeElement) && window.innerWidth < 1024) searchToggleRef.current?.focus()
        setSearchOpen(false)
        setSearchResults([])
        setShowCategoryMenu(false)
        setShowUserMenu(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])

  async function loadKategoriler() {
    setCategoryLoadError(false)
    try {
      setKategoriler(await loadCategories(publicSupabase, true))
    } catch {
      setCategoryLoadError(true)
    }
  }

  async function performSearch(query: string) {
    const searchTerm = query.trim()
    if (searchTerm.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    const requestId = ++searchRequestRef.current
    setSearchLoading(true)
    try {
      // Tek sunucu isteği: ad/açıklama/kategori/marka araması, sıralama ve
      // yalnız izinli satış satırı fiyatı public-catalog içinde hesaplanır.
      const page = await loadPublicCatalog({ q: searchTerm, limit: 6 })
      if (requestId !== searchRequestRef.current) return
      setSearchResults(page.urunler.map((urun) => ({
        ...urun,
        ilkStok: urun.urun_stoklari[0] || null,
        kategoriAdi: urun.kategoriler?.kategori_adi,
      })))
    } catch (error) {
      if (requestId !== searchRequestRef.current) return
      console.error('Arama hatası:', error)
      setSearchResults([])
    } finally {
      if (requestId === searchRequestRef.current) setSearchLoading(false)
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    navigate(`/urunler?q=${encodeURIComponent(query)}`)
    setSearchQuery('')
    setSearchResults([])
    setSearchOpen(false)
    setMenuOpen(false)
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value)
    setSearchOpen(true)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    if (value.trim().length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }
    setSearchLoading(true)
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value)
    }, 250)
  }

  const closeMenus = useCallback(() => {
    setMenuOpen(false)
    setSearchOpen(false)
    setShowCategoryMenu(false)
    setShowUserMenu(false)
    setSearchResults([])
  }, [])

  const cartCount = toplamAdet || sepetItems.length
  const logoSetting = Math.min(240, Math.max(50, Number(logo.width) || 120))
  // Üst menüde başlık ve işlem ikonları her ekranda rahatça sığmalıdır.
  const logoSize = Math.min(40, Math.round(36 + ((logoSetting - 50) / 190) * 20))
  const canAccessAdmin = isAdmin || musteriData?.musteri_tipi === 'admin'

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-brand-line bg-brand-paper">
      <div className="site-primary-bg px-4 py-1 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-white">
        Sofranıza bir tutam lezzet
      </div>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 py-2 lg:grid-cols-[auto_minmax(330px,1fr)_minmax(200px,360px)_auto] lg:gap-x-5 lg:py-3">
          <Link to="/" className="order-1 flex min-w-0 items-center gap-2" onClick={closeMenus}>
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ${logo.url ? 'border border-brand-line bg-brand-paper' : 'text-emerald-700'}`}
              style={logo.url ? { width: logoSize, height: logoSize } : undefined}
            >
              {logo.url ? (
                <SiteImage variant="thumb" loading="eager"
                  src={getImageUrl(logo.url)}
                  alt={`${siteInfo.siteName} logosu`}
                  fetchPriority="high"
                  className="h-full w-full object-contain object-center"
                />
              ) : themeLoading ? null : <Sprout aria-hidden="true" className="h-7 w-7" />}
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-semibold leading-tight tracking-tight text-brand-ink sm:text-xl">{siteInfo.siteName}</div>
            </div>
          </Link>

          <nav className="order-3 col-span-full flex min-w-0 items-center justify-between gap-1 lg:order-2 lg:col-span-1 lg:justify-evenly" aria-label="Ana gezinme">
            <div ref={categoryMenuRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setShowCategoryMenu(false) }}>
              <button ref={categoryToggleRef} type="button" onClick={() => { setShowCategoryMenu(value => !value); setSearchOpen(false); setShowUserMenu(false) }} aria-expanded={showCategoryMenu} aria-controls="header-category-tree" className="flex min-h-11 items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-brand-ink hover:bg-brand-soft sm:px-3 sm:text-sm">
                Kategoriler <ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${showCategoryMenu ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {showCategoryMenu && <CategoryMegaMenu nodes={categoryTree} error={categoryLoadError} onRetry={loadKategoriler} onNavigate={closeMenus} />}
            </div>
            {navLinks.map(link => <NavLink key={link.to} to={link.to} onClick={closeMenus} className={({ isActive }) => `flex min-h-11 items-center whitespace-nowrap rounded-lg px-2 py-2 text-xs font-semibold transition sm:px-3 sm:text-sm ${isActive ? 'bg-brand-soft text-brand-ink' : 'text-brand-muted hover:bg-brand-soft hover:text-brand-ink'}`}>{link.label}</NavLink>)}
          </nav>

          <div className="order-2 flex shrink-0 items-center gap-1 lg:order-4 lg:gap-2">
            <button ref={searchToggleRef} type="button" onClick={() => { setSearchOpen(value => !value); setShowCategoryMenu(false); requestAnimationFrame(() => { if (searchInputRef.current?.getClientRects().length) searchInputRef.current.focus() }) }} className="shop-icon-button lg:hidden" aria-label="Aramayı aç" aria-expanded={searchOpen} aria-controls="header-search"><Search className="h-5 w-5" aria-hidden="true" /></button>
            <Link
              to="/sepet"
              onClick={closeMenus}
              className="shop-icon-button relative"
              aria-label="Sepet"
            >
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {cartCount > 0 && (
                <span className="site-secondary-bg absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div ref={userMenuRef} className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setShowUserMenu((value) => !value)}
                  aria-expanded={showUserMenu}
                  className="shop-btn-secondary gap-2 px-3"
                >
                  <User className="h-5 w-5" />
                  Hesabım
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
                    <Link to="/hesabim" onClick={closeMenus} className="block px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50">
                      Profilim
                    </Link>
                    <Link to="/sorularim" onClick={closeMenus} className="block px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50">
                      Sorularım
                    </Link>
                    {musteriData?.musteri_tipi === 'bayi' && <Link to="/bayi-panel" onClick={closeMenus} className="block px-4 py-3 text-sm hover:bg-brand-soft">Bayi Paneli</Link>}
                    {musteriData?.musteri_tipi === 'xml_musteri' && <><Link to="/xml-siparis" onClick={closeMenus} className="block px-4 py-3 text-sm hover:bg-brand-soft">XML Sipariş</Link><Link to="/xml-siparislerim" onClick={closeMenus} className="block px-4 py-3 text-sm hover:bg-brand-soft">Siparişlerim</Link></>}
                    {canAccessAdmin && <Link to="/admin" onClick={closeMenus} className="block px-4 py-3 text-sm hover:bg-brand-soft">Yönetim Paneli</Link>}
                    <button
                      type="button"
                      onClick={() => {
                        closeMenus()
                        signOut()
                      }}
                      className="block w-full px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/giris" onClick={closeMenus} className="shop-icon-button hidden lg:inline-flex" aria-label="Giriş yap">
                <User className="h-5 w-5" aria-hidden="true" />
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="shop-icon-button lg:hidden"
              aria-label={menuOpen ? 'Menüyü kapat' : 'Menüyü aç'}
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? 'store-mobile-menu' : undefined}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
          <div id="header-search" ref={searchContainerRef} className={`${searchOpen ? 'block' : 'hidden'} relative order-4 col-span-full min-w-0 pb-1 lg:order-3 lg:col-span-1 lg:block lg:pb-0`}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                aria-label="Ürün ara"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                placeholder="Hangi baharatı arıyorsunuz?"
                className="shop-input bg-brand-cream py-2 pl-12 pr-20 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  aria-label="Aramayı temizle"
                  className="absolute right-16 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-700"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <button type="submit" className="absolute bottom-1 right-1 top-1 min-h-0 rounded-lg px-3 text-sm font-medium text-emerald-800 transition hover:bg-brand-soft">
                Ara
              </button>

              {searchOpen && (searchResults.length > 0 || searchLoading || searchQuery.trim().length >= 2) && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(24rem,45dvh)] overflow-y-auto overscroll-contain rounded-lg border border-zinc-200 bg-white shadow-xl">
                  {searchLoading ? (
                    <div className="px-4 py-5 text-center text-sm text-zinc-500">Aranıyor...</div>
                  ) : searchResults.length > 0 ? (
                    <div className="divide-y divide-zinc-100">
                      {searchResults.map((urun) => (
                        <button
                          key={urun.id}
                          type="button"
                          onClick={() => {
                            navigate(`/urun/${urun.id}`)
                            closeMenus()
                          }}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
                        >
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
                            {urun.ana_gorsel_url ? (
                              <SiteImage variant="thumb" src={getImageUrl(urun.ana_gorsel_url)} alt={urun.urun_adi} className="h-full w-full object-contain" />
                            ) : (
                              <div className="site-primary-bg flex h-full w-full items-center justify-center text-white">{urun.urun_adi.charAt(0)}</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-zinc-900">{urun.urun_adi}</div>
                            {urun.kategoriAdi && <div className="truncate text-xs text-zinc-500">{urun.kategoriAdi}</div>}
                            {urun.ilkStok && <div className="text-sm font-bold text-amber-700">{formatPrice(Number(urun.ilkStok.fiyat))}</div>}
                          </div>
                        </button>
                      ))}
                      <div className="bg-zinc-50 px-4 py-2.5 text-center">
                        <button
                          type="submit"
                          className="site-primary-text text-xs font-bold hover:opacity-80"
                        >
                          "{searchQuery}" için tüm sonuçları gör &rarr;
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 py-5 text-center text-sm text-zinc-500">Ürün bulunamadı</div>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        <AccessibleModal open={menuOpen} title="Mobil menü" closeLabel="Menüyü kapat" onClose={closeMenus} className="anadolu-store max-w-md sm:ml-auto sm:mr-0">
              <div id="store-mobile-menu" className="grid gap-2 pb-2">
                <p className="shop-eyebrow mb-2">Mutfağınıza ne lazım?</p>
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} onClick={closeMenus} className="rounded-lg px-3 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">
                  {link.label}
                </Link>
              ))}
              <div className="rounded-lg bg-zinc-50 p-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">Kategoriler</div>
                <div className="grid gap-1">
                  {categoryLoadError ? <button type="button" onClick={loadKategoriler} className="min-h-11 px-2 text-left text-sm text-red-700">Kategoriler yüklenemedi. Tekrar dene</button> : <CategoryNavigation nodes={categoryTree} onNavigate={closeMenus} />}
                </div>
              </div>
              {user ? (
                <>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-zinc-500">Giriş yapılan hesap</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-zinc-900">{user.email}</p>
                    </div>
                    <Link to="/hesabim" onClick={closeMenus} className="mt-3 flex min-h-10 items-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-zinc-800 shadow-sm ring-1 ring-zinc-200">
                      Hesabım
                    </Link>
                  </div>
                  {musteriData?.musteri_tipi === 'bayi' && (
                    <Link to="/bayi-panel" onClick={closeMenus} className="rounded-lg px-3 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-100">
                      Bayi Paneli
                    </Link>
                  )}
                  {musteriData?.musteri_tipi === 'xml_musteri' && (
                    <>
                      <Link to="/xml-siparis" onClick={closeMenus} className="rounded-lg px-3 py-3 text-sm font-semibold text-violet-800 hover:bg-violet-50">XML Sipariş</Link>
                      <Link to="/xml-siparislerim" onClick={closeMenus} className="rounded-lg px-3 py-3 text-sm font-semibold text-violet-800 hover:bg-violet-50">Siparişlerim</Link>
                    </>
                  )}
                  {canAccessAdmin && (
                    <Link to="/admin" onClick={closeMenus} className="flex min-h-11 items-center gap-2 rounded-lg bg-amber-50 px-3 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100">
                      <LayoutDashboard className="h-5 w-5" />
                      Yönetim Paneli
                    </Link>
                  )}
                  <button type="button" onClick={() => { closeMenus(); void signOut() }} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-3 text-left text-sm font-semibold text-zinc-800 hover:bg-zinc-100">
                    <LogOut className="h-5 w-5" />
                    Çıkış Yap
                  </button>
                </>
              ) : (
                <Link to="/giris" onClick={closeMenus} className="shop-btn-primary mt-2">
                  Giriş Yap
                </Link>
              )}
              </div>
        </AccessibleModal>
      </div>
    </header>
  )
}
