import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, User, Search, Menu, X, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSepet } from '../contexts/SepetContext'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Header() {
  const { user, isAdmin, musteriData, signOut } = useAuth()
  const { toplamAdet } = useSepet()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [kategoriler, setKategoriler] = useState<any[]>([])
  const [showKategoriDropdown, setShowKategoriDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [kategoriTimeout, setKategoriTimeout] = useState<NodeJS.Timeout | null>(null)
  const [userTimeout, setUserTimeout] = useState<NodeJS.Timeout | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadKategoriler()
  }, [])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (kategoriTimeout) clearTimeout(kategoriTimeout)
      if (userTimeout) clearTimeout(userTimeout)
    }
  }, [kategoriTimeout, userTimeout])

  async function loadKategoriler() {
    const { data } = await supabase
      .from('kategoriler')
      .select('id, kategori_adi')
      .eq('aktif_durum', true)
      .is('ust_kategori_id', null)
      .order('sira_no')
    
    if (data) setKategoriler(data)
  }

  // Real-time search fonksiyonu
  async function performSearch(query: string) {
    if (query.trim().length < 1) {
      setSearchResults([])
      setShowDropdown(false)
      return
    }

    setSearchLoading(true)
    try {
      // Önce ürünleri al
      const { data: urunler, error: urunlerError } = await supabase
        .from('urunler')
        .select('id, urun_adi, ana_gorsel_url')
        .eq('aktif_durum', true)
        .ilike('urun_adi', `${query}%`)
        .limit(5)

      if (urunlerError) throw urunlerError

      if (urunler) {
        // Her ürün için stok bilgilerini al
        const formattedResults = await Promise.all(
          urunler.map(async (urun) => {
            const { data: stoklar } = await supabase
              .from('urun_stoklari')
              .select('fiyat, birim_turu')
              .eq('urun_id', urun.id)
              .eq('aktif_durum', true)
              .order('fiyat', { ascending: true })
              .limit(1)
              .single()

            return {
              ...urun,
              ilkGorsel: urun.ana_gorsel_url,
              ilkStok: stoklar
            }
          })
        )

        setSearchResults(formattedResults)
        setShowDropdown(true)
      } else {
        setSearchResults([])
        setShowDropdown(false)
      }
    } catch (error) {
      console.error('Arama hatası:', error)
      setSearchResults([])
      setShowDropdown(false)
    } finally {
      setSearchLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/urunler?q=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setSearchResults([])
      setShowDropdown(false)
      setSearchOpen(false)
    }
  }

  // Arama input değişikliği için handler
  function handleSearchInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setSearchQuery(value)
    performSearch(value)
  }

  // Dropdown kapatma
  function closeDropdown() {
    setShowDropdown(false)
  }

  // Arama sonucuna tıklama
  function handleResultClick(urunId: string) {
    navigate(`/urun/${urunId}`)
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
    setSearchOpen(false)
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">EfsaneBaharat</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-orange-600 transition">
              Ana Sayfa
            </Link>
            <Link to="/urunler" className="text-gray-700 hover:text-orange-600 transition">
              Ürünler
            </Link>
            
            {/* Kategoriler Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => {
                if (kategoriTimeout) clearTimeout(kategoriTimeout)
                setShowKategoriDropdown(true)
              }}
              onMouseLeave={() => {
                const timeout = setTimeout(() => setShowKategoriDropdown(false), 200)
                setKategoriTimeout(timeout)
              }}
            >
              <button className="flex items-center space-x-1 text-gray-700 hover:text-orange-600 transition">
                <span>Kategoriler</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showKategoriDropdown && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Link 
                    to="/urunler"
                    className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                    onClick={() => setShowKategoriDropdown(false)}
                  >
                    Tüm Ürünler
                  </Link>
                  <div className="border-t my-1"></div>
                  {kategoriler.map((kategori) => (
                    <Link
                      key={kategori.id}
                      to={`/urunler?kategori=${kategori.id}`}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                      onClick={() => setShowKategoriDropdown(false)}
                    >
                      {kategori.kategori_adi}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            <Link to="/en-cok-satan" className="text-gray-700 hover:text-orange-600 transition">
              En Çok Satan Ürünler
            </Link>
            <Link to="/kampanyalar" className="text-gray-700 hover:text-orange-600 transition">
              Kampanyalar
            </Link>
            <Link to="/bize-ulasin" className="text-gray-700 hover:text-orange-600 transition">
              Bize Ulaşın
            </Link>
            {user && musteriData?.musteri_tipi === 'bayi' && (
              <Link to="/bayi-panel" className="text-gray-700 hover:text-orange-600 transition">
                Bayi Paneli
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" className="text-gray-700 hover:text-orange-600 transition">
                Admin Paneli
              </Link>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setSearchOpen(!searchOpen)}
              className="hidden md:block text-gray-600 hover:text-orange-600 transition"
              title="Arama"
            >
              <Search className="w-5 h-5" />
            </button>
            
            <Link to="/sepet" className="relative text-gray-600 hover:text-orange-600 transition">
              <ShoppingCart className="w-5 h-5" />
              {toplamAdet > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {toplamAdet}
                </span>
              )}
            </Link>

            {user ? (
              <div 
                className="relative"
                onMouseEnter={() => {
                  if (userTimeout) clearTimeout(userTimeout)
                  setShowUserDropdown(true)
                }}
                onMouseLeave={() => {
                  const timeout = setTimeout(() => setShowUserDropdown(false), 200)
                  setUserTimeout(timeout)
                }}
              >
                <button className="flex items-center space-x-2 text-gray-700 hover:text-orange-600 transition">
                  <User className="w-5 h-5" />
                  <span className="hidden md:block">Hesabım</span>
                </button>
                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link 
                      to="/hesabim" 
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      Profilim
                    </Link>
                    <Link 
                      to="/sorularim" 
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      Sorularım
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserDropdown(false)
                        signOut()
                      }}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/giris"
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition"
              >
                Giriş Yap
              </Link>
            )}

            <button
              className="md:hidden text-gray-600"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {searchOpen && (
          <div className="hidden md:block py-4 border-t animate-in slide-in-from-top relative">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  placeholder="Ürün ara..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  autoFocus
                />
                
                {/* Arama Sonuçları Dropdown */}
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {searchLoading ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="inline-block w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-2">Aranıyor...</span>
                      </div>
                    ) : searchResults.length > 0 ? (
                      <div className="py-2">
                        {searchResults.map((urun) => (
                          <div
                            key={urun.id}
                            onClick={() => handleResultClick(urun.id)}
                            className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition"
                          >
                            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {urun.ilkGorsel ? (
                                <img
                                  src={urun.ilkGorsel}
                                  alt={urun.urun_adi}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600">
                                  <span className="text-white text-lg font-bold">
                                    {urun.urun_adi.charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {urun.urun_adi}
                              </h4>
                              {urun.ilkStok && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-orange-600 font-semibold">
                                    {urun.ilkStok.fiyat.toFixed(2)} ₺
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {urun.ilkStok.birim_turu}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* Tüm sonuçları gör linki */}
                        {searchQuery.trim().length >= 2 && (
                          <div className="border-t border-gray-100">
                            <button
                              type="submit"
                              className="w-full text-left px-4 py-3 text-sm text-orange-600 hover:bg-orange-50 font-medium transition"
                              onClick={() => {
                                navigate(`/urunler?q=${encodeURIComponent(searchQuery.trim())}`)
                                setSearchQuery('')
                                setSearchResults([])
                                setShowDropdown(false)
                                setSearchOpen(false)
                              }}
                            >
                              Tüm sonuçları gör ("{searchQuery}")
                            </button>
                          </div>
                        )}
                      </div>
                    ) : searchQuery.trim().length >= 2 ? (
                      <div className="p-4 text-center text-gray-500">
                        <Search className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <span>Ürün bulunamadı</span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Ara
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(false)
                  setSearchResults([])
                  setShowDropdown(false)
                  setSearchQuery('')
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </form>
            
            {/* Dropdown dışına tıklandığında kapatmak için overlay */}
            {showDropdown && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={closeDropdown}
              />
            )}
          </div>
        )}

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t">
            {/* Mobile Search */}
            <div className="mb-4 relative">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    placeholder="Ürün ara..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  
                  {/* Mobile Arama Sonuçları Dropdown */}
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                      {searchLoading ? (
                        <div className="p-4 text-center text-gray-500">
                          <div className="inline-block w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="ml-2">Aranıyor...</span>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="py-2">
                          {searchResults.map((urun) => (
                            <div
                              key={urun.id}
                              onClick={() => handleResultClick(urun.id)}
                              className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition"
                            >
                              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                {urun.ilkGorsel ? (
                                  <img
                                    src={urun.ilkGorsel}
                                    alt={urun.urun_adi}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600">
                                    <span className="text-white text-lg font-bold">
                                      {urun.urun_adi.charAt(0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {urun.urun_adi}
                                </h4>
                                {urun.ilkStok && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-orange-600 font-semibold">
                                      {urun.ilkStok.fiyat.toFixed(2)} ₺
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {urun.ilkStok.birim_turu}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {/* Tüm sonuçları gör linki */}
                          {searchQuery.trim().length >= 2 && (
                            <div className="border-t border-gray-100">
                              <button
                                type="submit"
                                className="w-full text-left px-4 py-3 text-sm text-orange-600 hover:bg-orange-50 font-medium transition"
                                onClick={(e) => {
                                  e.preventDefault()
                                  navigate(`/urunler?q=${encodeURIComponent(searchQuery.trim())}`)
                                  setSearchQuery('')
                                  setSearchResults([])
                                  setShowDropdown(false)
                                  setMenuOpen(false)
                                }}
                              >
                                Tüm sonuçları gör ("{searchQuery}")
                              </button>
                            </div>
                          )}
                        </div>
                      ) : searchQuery.trim().length >= 2 ? (
                        <div className="p-4 text-center text-gray-500">
                          <Search className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                          <span>Ürün bulunamadı</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                >
                  <Search className="w-5 h-5" />
                </button>
              </form>
              
              {/* Dropdown dışına tıklandığında kapatmak için overlay */}
              {showDropdown && (
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={closeDropdown}
                />
              )}
            </div>

            <Link
              to="/"
              className="block py-2 text-gray-700 hover:text-orange-600"
              onClick={() => setMenuOpen(false)}
            >
              Ana Sayfa
            </Link>
            <Link
              to="/urunler"
              className="block py-2 text-gray-700 hover:text-orange-600"
              onClick={() => setMenuOpen(false)}
            >
              Ürünler
            </Link>
            
            {/* Kategoriler - Mobile */}
            <div className="py-2">
              <div className="font-semibold text-gray-900 mb-2">Kategoriler</div>
              <div className="pl-4 space-y-2">
                <Link
                  to="/urunler"
                  className="block py-1 text-gray-700 hover:text-orange-600"
                  onClick={() => setMenuOpen(false)}
                >
                  Tüm Ürünler
                </Link>
                {kategoriler.map((kategori) => (
                  <Link
                    key={kategori.id}
                    to={`/urunler?kategori=${kategori.id}`}
                    className="block py-1 text-gray-700 hover:text-orange-600"
                    onClick={() => setMenuOpen(false)}
                  >
                    {kategori.kategori_adi}
                  </Link>
                ))}
              </div>
            </div>
            
            <Link
              to="/en-cok-satan"
              className="block py-2 text-gray-700 hover:text-orange-600"
              onClick={() => setMenuOpen(false)}
            >
              En Çok Satan Ürünler
            </Link>
            <Link
              to="/kampanyalar"
              className="block py-2 text-gray-700 hover:text-orange-600"
              onClick={() => setMenuOpen(false)}
            >
              Kampanyalar
            </Link>
            <Link
              to="/bize-ulasin"
              className="block py-2 text-gray-700 hover:text-orange-600"
              onClick={() => setMenuOpen(false)}
            >
              Bize Ulaşın
            </Link>
            {user && musteriData?.musteri_tipi === 'bayi' && (
              <Link
                to="/bayi-panel"
                className="block py-2 text-gray-700 hover:text-orange-600"
                onClick={() => setMenuOpen(false)}
              >
                Bayi Paneli
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="block py-2 text-gray-700 hover:text-orange-600"
                onClick={() => setMenuOpen(false)}
              >
                Admin Paneli
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
