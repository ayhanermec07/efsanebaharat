import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, LayoutDashboard, LogOut, Menu, Search, ShoppingBag, Sprout, User, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSepet } from '../contexts/SepetContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../lib/supabase'
import { getImageUrl } from '../utils/imageUtils'
import {
  getMatchingBrandIds,
  getMatchingCategoryIds,
  scoreProductRelevance,
} from '../utils/categorySearch'
import AccessibleModal from './admin/AccessibleModal'

const navLinks = [
  { to: '/', label: 'Ana Sayfa' },
  { to: '/urunler', label: 'Ürünler' },
  { to: '/en-cok-satan', label: 'En Çok Satanlar' },
  { to: '/kampanyalar', label: 'Kampanyalar' },
  { to: '/bize-ulasin', label: 'İletişim' },
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
  const [kategoriler, setKategoriler] = useState<any[]>([])
  const navigate = useNavigate()

  const searchContainerRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadKategoriler()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchResults([])
        setSearchOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchResults([])
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
    const { data } = await supabase
      .from('kategoriler')
      .select('id, kategori_adi')
      .eq('aktif_durum', true)
      .is('ust_kategori_id', null)
      .order('sira_no')

    if (data) setKategoriler(data)
  }

  async function performSearch(query: string) {
    const searchTerm = query.trim()
    if (searchTerm.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      return
    }

    setSearchLoading(true)
    try {
      const [{ data: allCategories }, { data: allBrands }] = await Promise.all([
        supabase.from('kategoriler').select('id, kategori_adi, ust_kategori_id').eq('aktif_durum', true),
        supabase.from('markalar').select('id, marka_adi').eq('aktif_durum', true),
      ])

      const matchingCategoryIds = getMatchingCategoryIds(allCategories || [], searchTerm)
      const matchingBrandIds = getMatchingBrandIds(allBrands || [], searchTerm)
      const categoryNameById = new Map((allCategories || []).map((category) => [category.id, category.kategori_adi]))

      const productFields = 'id, urun_adi, ana_gorsel_url, kategori_id, aciklama'
      const nameSearch = supabase
        .from('urunler')
        .select(productFields)
        .eq('aktif_durum', true)
        .ilike('urun_adi', `%${searchTerm}%`)
        .limit(8)

      const categorySearch = matchingCategoryIds.length > 0
        ? supabase
          .from('urunler')
          .select(productFields)
          .eq('aktif_durum', true)
          .in('kategori_id', matchingCategoryIds)
          .limit(8)
        : Promise.resolve({ data: [], error: null })

      const brandSearch = matchingBrandIds.length > 0
        ? supabase
          .from('urunler')
          .select(productFields)
          .eq('aktif_durum', true)
          .in('marka_id', matchingBrandIds)
          .limit(8)
        : Promise.resolve({ data: [], error: null })

      const [nameResult, categoryResult, brandResult] = await Promise.all([nameSearch, categorySearch, brandSearch])

      if (nameResult.error || categoryResult.error || brandResult.error) {
        console.error('Arama sorgusu hatası:', nameResult.error || categoryResult.error || brandResult.error)
      }

      const uniqueProducts = new Map<string, any>()
      for (const product of [...(nameResult.data || []), ...(categoryResult.data || []), ...(brandResult.data || [])]) {
        uniqueProducts.set(product.id, product)
      }

      const urunlerData = Array.from(uniqueProducts.values())

      if (urunlerData.length === 0) {
        setSearchResults([])
        setSearchLoading(false)
        return
      }

      const sortedUrunler = [...urunlerData].sort((a, b) => scoreProductRelevance(b, searchTerm) - scoreProductRelevance(a, searchTerm))
      const urunler = sortedUrunler.slice(0, 6)

      const results = await Promise.all(
        urunler.map(async (urun) => {
          const { data: stok } = await supabase
            .from('urun_stoklari')
            .select('fiyat, birim_turu')
            .eq('urun_id', urun.id)
            .eq('aktif_durum', true)
            .order('fiyat', { ascending: true })
            .limit(1)
            .maybeSingle()

          return { ...urun, ilkStok: stok, kategoriAdi: categoryNameById.get(urun.kategori_id) }
        }),
      )

      setSearchResults(results)
    } catch (error) {
      console.error('Arama hatası:', error)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
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
    <header className="sticky top-0 z-40 border-b border-brand-line bg-brand-paper">
      <div className="site-primary-bg px-4 py-2 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-white">
        Sofranıza bir tutam lezzet
      </div>
      <div className="shop-container">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,420px)_auto] lg:gap-x-6 lg:py-5">
          <Link to="/" className="order-1 flex min-w-0 items-center gap-2 sm:gap-3" onClick={closeMenus}>
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg ${logo.url ? 'border border-brand-line bg-brand-paper' : 'text-emerald-700'}`}
              style={logo.url ? { width: logoSize, height: logoSize } : undefined}
            >
              {logo.url ? (
                <img
                  src={getImageUrl(logo.url)}
                  alt={`${siteInfo.siteName} logosu`}
                  fetchPriority="high"
                  className="h-full w-full object-contain object-center"
                />
              ) : themeLoading ? null : <Sprout aria-hidden="true" className="h-7 w-7" />}
            </div>
            <div className="min-w-0">
              <div className="line-clamp-2 break-words font-display text-xl font-semibold leading-tight tracking-tight text-brand-ink sm:text-2xl">{siteInfo.siteName}</div>
              <div className="mt-1 hidden truncate text-[11px] font-medium tracking-wide text-brand-muted sm:block">{siteInfo.tagline}</div>
            </div>
          </Link>

          <nav className="order-4 col-span-full hidden flex-wrap items-center justify-center gap-1 border-t border-brand-line pt-3 lg:flex" aria-label="Ana gezinme">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-emerald-50 text-emerald-900' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryMenu((value) => !value)}
                aria-expanded={showCategoryMenu}
                className="flex min-h-11 items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-brand-ink transition hover:bg-brand-soft"
              >
                Kategoriler
                <ChevronDown className="h-4 w-4" />
              </button>
              {showCategoryMenu && (
                <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
                  <Link to="/urunler" onClick={closeMenus} className="block px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
                    Tüm ürünler
                  </Link>
                  <div className="max-h-80 overflow-y-auto border-t border-zinc-100 py-1">
                    {kategoriler.map((kategori) => (
                      <Link
                        key={kategori.id}
                        to={`/urunler?kategori=${kategori.id}`}
                        onClick={closeMenus}
                        className="block px-4 py-2 text-sm text-zinc-700 hover:bg-emerald-50 hover:text-emerald-900"
                      >
                        {kategori.kategori_adi}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {user && musteriData?.musteri_tipi === 'bayi' && (
              <NavLink to="/bayi-panel" className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100">
                Bayi Paneli
              </NavLink>
            )}
            {user && musteriData?.musteri_tipi === 'xml_musteri' && (
              <>
                <NavLink to="/xml-siparis" className="rounded-lg px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">XML Sipariş</NavLink>
                <NavLink to="/xml-siparislerim" className="rounded-lg px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50">Siparişlerim</NavLink>
              </>
            )}
            {canAccessAdmin && (
              <NavLink to="/admin" className="rounded-lg px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50">
                Admin
              </NavLink>
            )}
          </nav>

          <div className="order-2 flex shrink-0 items-center gap-2 lg:order-3">
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
              <div className="relative hidden sm:block">
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
              <Link to="/giris" onClick={closeMenus} className="shop-icon-button" aria-label="Giriş yap">
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
          <div ref={searchContainerRef} className="relative order-3 col-span-full min-w-0 lg:order-2 lg:col-span-1">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-zinc-400" />
              <input
                type="text"
                aria-label="Ürün ara"
                  value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setSearchOpen(true)}
                placeholder="Hangi baharatı arıyorsunuz?"
                className="shop-input bg-brand-cream pl-12 pr-28 text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  className="absolute right-20 top-3 text-zinc-400 hover:text-zinc-600"
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
                              <img src={getImageUrl(urun.ana_gorsel_url)} alt={urun.urun_adi} className="h-full w-full object-contain" />
                            ) : (
                              <div className="site-primary-bg flex h-full w-full items-center justify-center text-white">{urun.urun_adi.charAt(0)}</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-zinc-900">{urun.urun_adi}</div>
                            {urun.kategoriAdi && <div className="truncate text-xs text-zinc-500">{urun.kategoriAdi}</div>}
                            {urun.ilkStok && <div className="text-sm font-bold text-amber-700">{Number(urun.ilkStok.fiyat).toFixed(2)} TL</div>}
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
                  {kategoriler.slice(0, 8).map((kategori) => (
                    <Link key={kategori.id} to={`/urunler?kategori=${kategori.id}`} onClick={closeMenus} className="rounded-md px-2 py-2 text-sm text-zinc-700 hover:bg-white">
                  {kategori.kategori_adi}
                    </Link>
                  ))}
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
