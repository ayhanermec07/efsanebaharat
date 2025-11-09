import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, ShoppingBag, TruckIcon, Shield, Search } from 'lucide-react'
import CanliDestekWidget from '../components/CanliDestekWidget'

export default function AnaSayfa() {
  const [banners, setBanners] = useState<any[]>([])
  const [oneCikanUrunler, setOneCikanUrunler] = useState<any[]>([])
  const [enCokSatanlar, setEnCokSatanlar] = useState<any[]>([])
  const [yeniEklenenler, setYeniEklenenler] = useState<any[]>([])
  const [markalar, setMarkalar] = useState<any[]>([])
  const [currentBanner, setCurrentBanner] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [bestsellerPage, setBestsellerPage] = useState(0)
  const [newProductsPage, setNewProductsPage] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
  }, [])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/urunler?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  async function loadData() {
    // Banner'ları yükle
    const { data: bannerData } = await supabase
      .from('bannerlar')
      .select('*')
      .eq('aktif_durum', true)
      .order('sira_no')
    
    if (bannerData) setBanners(bannerData)

    // Öne çıkan ürünleri yükle (admin'in seçtikleri)
    const { data: onerilenData } = await supabase
      .from('onerilen_urunler')
      .select('urun_id')
      .eq('manuel_secim', true)
      .order('goruntuleme_sirasi')
      .limit(4)
    
    if (onerilenData && onerilenData.length > 0) {
      const urunIds = onerilenData.map(o => o.urun_id)
      await loadUrunlerByIds(urunIds, setOneCikanUrunler)
    } else {
      // Fallback: Random 4 ürün
      const { data: fallbackData } = await supabase
        .from('urunler')
        .select('id')
        .eq('aktif_durum', true)
        .limit(4)
      
      if (fallbackData && fallbackData.length > 0) {
        const urunIds = fallbackData.map(u => u.id)
        await loadUrunlerByIds(urunIds, setOneCikanUrunler)
      }
    }

    // En çok satanları yükle (12 ürün - 3 sayfa x 4 ürün)
    // Fallback: created_at'e göre sıralama (satış verisi yoksa)
    const { data: bestsellerData } = await supabase
      .from('urunler')
      .select('id')
      .eq('aktif_durum', true)
      .order('created_at', { ascending: false })
      .limit(12)
    
    if (bestsellerData && bestsellerData.length > 0) {
      const urunIds = bestsellerData.map(u => u.id)
      await loadUrunlerByIds(urunIds, setEnCokSatanlar)
    }

    // Yeni eklenen ürünleri yükle (16 ürün - 4 sayfa x 4 ürün)
    const { data: yeniData } = await supabase
      .from('urunler')
      .select('id')
      .eq('aktif_durum', true)
      .order('created_at', { ascending: false })
      .limit(16)
    
    if (yeniData && yeniData.length > 0) {
      const urunIds = yeniData.map(u => u.id)
      await loadUrunlerByIds(urunIds, setYeniEklenenler)
    }

    // Markaları yükle
    const { data: markaData } = await supabase
      .from('markalar')
      .select('*')
      .eq('aktif_durum', true)
      .order('marka_adi')
    
    if (markaData) setMarkalar(markaData)
  }

  async function loadUrunlerByIds(urunIds: string[], setter: Function) {
    const { data: urunData } = await supabase
      .from('urunler')
      .select('*')
      .in('id', urunIds)
      .eq('aktif_durum', true)
    
    if (urunData && urunData.length > 0) {
      // Ürün görselleri ve stokları ayrı çek
      const { data: gorseller } = await supabase
        .from('urun_gorselleri')
        .select('*')
        .in('urun_id', urunIds)
        .order('sira_no')
      
      const { data: stoklar } = await supabase
        .from('urun_stoklari')
        .select('*')
        .in('urun_id', urunIds)
        .eq('aktif_durum', true)
      
      // Ürünlere görselleri ve stokları ekle
      const urunlerWithData = urunData.map(urun => ({
        ...urun,
        urun_gorselleri: gorseller?.filter(g => g.urun_id === urun.id) || [],
        urun_stoklari: stoklar?.filter(s => s.urun_id === urun.id) || []
      }))
      
      setter(urunlerWithData)
    }
  }

  const nextBanner = () => {
    setCurrentBanner((prev) => (prev + 1) % banners.length)
  }

  const prevBanner = () => {
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length)
  }

  return (
    <div className="min-h-screen">
      {/* Banner Slider */}
      {banners.length > 0 && (
        <div className="relative h-96 md:h-[500px] bg-gradient-to-r from-orange-500 to-red-600 overflow-hidden">
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{
              backgroundImage: `url(${banners[currentBanner].resim_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          >
            <div className="absolute inset-0 bg-black bg-opacity-40" />
          </div>
          
          <div className="relative container mx-auto px-4 h-full flex flex-col justify-center">
            <div className="text-white max-w-2xl">
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                {banners[currentBanner].banner_baslik}
              </h1>
              <p className="text-xl md:text-2xl mb-8">
                {banners[currentBanner].banner_aciklama}
              </p>

              <Link
                to={banners[currentBanner].link_url || '/urunler'}
                className="inline-block bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
              >
                Keşfet
              </Link>
            </div>
          </div>

          {banners.length > 1 && (
            <>
              <button
                onClick={prevBanner}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 transition"
              >
                <ChevronLeft className="w-6 h-6 text-gray-900" />
              </button>
              <button
                onClick={nextBanner}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 transition"
              >
                <ChevronRight className="w-6 h-6 text-gray-900" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Öne Çıkan Ürünler - Horizontal Scroll */}
      {oneCikanUrunler.length > 0 && (
        <div className="bg-white py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Öne Çıkan Ürünler</h2>
              <Link to="/urunler" className="text-orange-600 hover:text-orange-700 font-semibold">
                Tümünü Gör
              </Link>
            </div>
            <div className="overflow-x-auto pb-4 hide-scrollbar">
              <div className="flex gap-6 min-w-min">
                {oneCikanUrunler.map((urun) => {
                  const ilkGorsel = urun.urun_gorselleri?.[0]?.gorsel_url
                  const ilkStok = urun.urun_stoklari?.[0]
                  
                  return (
                    <Link
                      key={urun.id}
                      to={`/urun/${urun.id}`}
                      className="flex-shrink-0 w-64 bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden"
                    >
                      <div className="aspect-square bg-gray-100 relative overflow-hidden">
                        {ilkGorsel ? (
                          <img
                            src={ilkGorsel}
                            alt={urun.urun_adi}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-4xl font-bold">
                                {urun.urun_adi.charAt(0)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                          {urun.urun_adi}
                        </h3>
                        {ilkStok && (
                          <div className="flex items-center justify-between">
                            <span className="text-orange-600 font-bold">
                              {ilkStok.fiyat.toFixed(2)} ₺
                            </span>
                            <span className="text-sm text-gray-500">{ilkStok.birim_turu}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* En Çok Satanlar - 4 ürün x 3 sayfa */}
      {enCokSatanlar.length > 0 && (
        <div className="bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">En Çok Satanlar</h2>
              <Link to="/en-cok-satan" className="text-orange-600 hover:text-orange-700 font-semibold">
                Tümünü Gör
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              {enCokSatanlar.slice(bestsellerPage * 4, (bestsellerPage + 1) * 4).map((urun) => {
                const ilkGorsel = urun.urun_gorselleri?.[0]?.gorsel_url
                const ilkStok = urun.urun_stoklari?.[0]
                
                return (
                  <Link
                    key={urun.id}
                    to={`/urun/${urun.id}`}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden"
                  >
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {ilkGorsel ? (
                        <img
                          src={ilkGorsel}
                          alt={urun.urun_adi}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-4xl font-bold">
                              {urun.urun_adi.charAt(0)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {urun.urun_adi}
                      </h3>
                      {ilkStok && (
                        <div className="flex items-center justify-between">
                          <span className="text-orange-600 font-bold">
                            {ilkStok.fiyat.toFixed(2)} ₺
                          </span>
                          <span className="text-sm text-gray-500">{ilkStok.birim_turu}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
            
            {/* Pagination */}
            {enCokSatanlar.length > 4 && (
              <div className="flex justify-center items-center space-x-2">
                <button
                  onClick={() => setBestsellerPage(Math.max(0, bestsellerPage - 1))}
                  disabled={bestsellerPage === 0}
                  className="p-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {[...Array(Math.ceil(enCokSatanlar.length / 4))].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setBestsellerPage(i)}
                    className={`w-8 h-8 rounded-lg transition ${
                      bestsellerPage === i
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setBestsellerPage(Math.min(Math.ceil(enCokSatanlar.length / 4) - 1, bestsellerPage + 1))}
                  disabled={bestsellerPage >= Math.ceil(enCokSatanlar.length / 4) - 1}
                  className="p-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Yeni Eklenenler - 4 ürün x 4 sayfa */}
      {yeniEklenenler.length > 0 && (
        <div className="bg-white py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Yeni Eklenen Ürünler</h2>
              <Link to="/urunler" className="text-orange-600 hover:text-orange-700 font-semibold">
                Tümünü Gör
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
              {yeniEklenenler.slice(newProductsPage * 4, (newProductsPage + 1) * 4).map((urun) => {
                const ilkGorsel = urun.urun_gorselleri?.[0]?.gorsel_url
                const ilkStok = urun.urun_stoklari?.[0]
                
                return (
                  <Link
                    key={urun.id}
                    to={`/urun/${urun.id}`}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden"
                  >
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      {ilkGorsel ? (
                        <img
                          src={ilkGorsel}
                          alt={urun.urun_adi}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-4xl font-bold">
                              {urun.urun_adi.charAt(0)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {urun.urun_adi}
                      </h3>
                      {ilkStok && (
                        <div className="flex items-center justify-between">
                          <span className="text-orange-600 font-bold">
                            {ilkStok.fiyat.toFixed(2)} ₺
                          </span>
                          <span className="text-sm text-gray-500">{ilkStok.birim_turu}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
            
            {/* Pagination */}
            {yeniEklenenler.length > 4 && (
              <div className="flex justify-center items-center space-x-2">
                <button
                  onClick={() => setNewProductsPage(Math.max(0, newProductsPage - 1))}
                  disabled={newProductsPage === 0}
                  className="p-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {[...Array(Math.ceil(yeniEklenenler.length / 4))].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setNewProductsPage(i)}
                    className={`w-8 h-8 rounded-lg transition ${
                      newProductsPage === i
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setNewProductsPage(Math.min(Math.ceil(yeniEklenenler.length / 4) - 1, newProductsPage + 1))}
                  disabled={newProductsPage >= Math.ceil(yeniEklenenler.length / 4) - 1}
                  className="p-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Markalar */}
      {markalar.length > 0 && (
        <div className="bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Markalarımız</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {markalar.map((marka) => (
                <Link
                  key={marka.id}
                  to={`/urunler?marka=${marka.id}`}
                  className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition text-center group"
                >
                  {marka.logo_url ? (
                    <img
                      src={marka.logo_url}
                      alt={marka.marka_adi}
                      className="h-20 mx-auto mb-4 object-contain"
                    />
                  ) : (
                    <div className="h-20 mb-4 flex items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-3xl font-bold">
                          {marka.marka_adi.charAt(0)}
                        </span>
                      </div>
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900 group-hover:text-orange-600 transition">
                    {marka.marka_adi}
                  </h3>
                  {marka.aciklama && (
                    <p className="text-sm text-gray-600 mt-2">{marka.aciklama}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Özellikler Bölümü - Footer Üzeri */}
      <div className="bg-white py-12 border-b mt-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TruckIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Hızlı Kargo</h3>
                <p className="text-gray-600 text-sm">Aynı gün kargo</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Güvenli Alışveriş</h3>
                <p className="text-gray-600 text-sm">256-bit SSL şifreleme</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Premium Kalite</h3>
                <p className="text-gray-600 text-sm">Özenle seçilmiş ürünler</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canlı Destek Widget */}
      <CanliDestekWidget />
    </div>
  )
}
