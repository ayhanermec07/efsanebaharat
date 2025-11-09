import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Calendar, Tag, Package } from 'lucide-react'

interface Kampanya {
  id: string
  baslik: string
  aciklama: string
  baslangic_tarihi: string
  bitis_tarihi: string
  aktif: boolean
  banner_gorseli: string | null
  kampanya_tipi: 'indirim' | 'paket' | 'ozel'
}

interface Banner {
  id: string
  kampanya_id: string
  gorsel_url: string
  baslik: string | null
  aciklama: string | null
  link_url: string | null
  goruntuleme_sirasi: number
  aktif: boolean
}

export default function Kampanyalar() {
  const [kampanyalar, setKampanyalar] = useState<Kampanya[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  // Banner otomatik geçiş
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % banners.length)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [banners.length])

  async function loadData() {
    try {
      setLoading(true)

      // Aktif kampanyaları yükle
      const { data: kampanyalarData, error: kampanyalarError } = await supabase
        .from('kampanyalar')
        .select('*')
        .eq('aktif', true)
        .gte('bitis_tarihi', new Date().toISOString())
        .order('baslangic_tarihi', { ascending: false })

      if (kampanyalarError) throw kampanyalarError

      // Aktif bannerları yükle
      const { data: bannersData, error: bannersError } = await supabase
        .from('kampanya_banner')
        .select('*')
        .eq('aktif', true)
        .order('goruntuleme_sirasi', { ascending: true })

      if (bannersError) throw bannersError

      setKampanyalar(kampanyalarData || [])
      setBanners(bannersData || [])
    } catch (error) {
      console.error('Veriler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  function isKampanyaActive(kampanya: Kampanya) {
    const now = new Date()
    const baslangic = new Date(kampanya.baslangic_tarihi)
    const bitis = new Date(kampanya.bitis_tarihi)
    return now >= baslangic && now <= bitis
  }

  function getKampanyaTipiLabel(tip: string) {
    switch (tip) {
      case 'indirim':
        return 'İndirim'
      case 'paket':
        return 'Paket Kampanya'
      case 'ozel':
        return 'Özel Fırsat'
      default:
        return tip
    }
  }

  function getKampanyaTipiColor(tip: string) {
    switch (tip) {
      case 'indirim':
        return 'bg-red-100 text-red-800'
      case 'paket':
        return 'bg-blue-100 text-blue-800'
      case 'ozel':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Yükleniyor...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner Carousel */}
      {banners.length > 0 && (
        <div className="relative bg-gradient-to-r from-orange-500 to-red-600 overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="relative h-80 md:h-96">
              {banners.map((banner, index) => (
                <div
                  key={banner.id}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    index === currentBannerIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white z-10">
                      {banner.baslik && (
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                          {banner.baslik}
                        </h2>
                      )}
                      {banner.aciklama && (
                        <p className="text-lg md:text-xl mb-6 max-w-2xl mx-auto">
                          {banner.aciklama}
                        </p>
                      )}
                      {banner.link_url && (
                        <Link
                          to={banner.link_url}
                          className="inline-block bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
                        >
                          Kampanyayı İncele
                        </Link>
                      )}
                    </div>
                    {banner.gorsel_url && (
                      <img
                        src={banner.gorsel_url}
                        alt={banner.baslik || 'Banner'}
                        className="absolute inset-0 w-full h-full object-cover opacity-20"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Banner Navigation Dots */}
          {banners.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBannerIndex(index)}
                  className={`w-2 h-2 rounded-full transition ${
                    index === currentBannerIndex ? 'bg-white w-8' : 'bg-white bg-opacity-50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kampanyalar Listesi */}
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Aktif Kampanyalar</h1>
          <p className="text-gray-600">
            Özel indirimler ve avantajlı fırsatları kaçırmayın
          </p>
        </div>

        {kampanyalar.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Tag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Şu anda aktif kampanya bulunmuyor.</p>
            <p className="text-sm text-gray-500 mt-2">
              Yeni kampanyalardan haberdar olmak için düzenli olarak kontrol edin.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {kampanyalar.map((kampanya) => {
              const isActive = isKampanyaActive(kampanya)
              
              return (
                <div
                  key={kampanya.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden"
                >
                  {/* Kampanya Görseli */}
                  {kampanya.banner_gorseli && (
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={kampanya.banner_gorseli}
                        alt={kampanya.baslik}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 right-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getKampanyaTipiColor(
                            kampanya.kampanya_tipi
                          )}`}
                        >
                          {getKampanyaTipiLabel(kampanya.kampanya_tipi)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {kampanya.baslik}
                    </h3>

                    {kampanya.aciklama && (
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {kampanya.aciklama}
                      </p>
                    )}

                    {/* Tarih Bilgisi */}
                    <div className="flex items-center space-x-2 text-sm text-gray-500 mb-3">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(kampanya.baslangic_tarihi)} - {formatDate(kampanya.bitis_tarihi)}
                      </span>
                    </div>

                    {/* Durum Badge */}
                    {isActive ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-600">
                          Kampanya Aktif
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium text-orange-600">
                          Yakında Başlıyor
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bilgilendirme */}
        <div className="mt-12 bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Package className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Kampanyalardan Nasıl Yararlanırım?
              </h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                Kampanyalardaki ürünler otomatik olarak indirimli fiyatlardan sepete eklenir. 
                Paket kampanyaları için kampanya ürünlerinin tamamını sepetinize eklemeniz gerekmektedir. 
                Kampanya koşulları ve detaylar için müşteri hizmetlerimizle iletişime geçebilirsiniz.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
